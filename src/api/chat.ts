// 채팅 관련 API 함수들
import { getRefreshToken, useAuthStore } from "@/stores/authStore";
import { useChatPreferencesStore } from "@/stores/chatPreferencesStore";
import { normalizeError } from "@/utils/errorHandler";
import apiClient from "@/lib/axios";
import {
  demoHistory,
  demoJoinGroupRoom,
  demoJoinDmRoom,
  demoParticipants,
  demoSendMessage,
  demoToggleMute,
  demoReadLatest,
  demoLeaveRoom,
} from "@/lib/mockChatApi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// 채팅방 참여 응답 타입
export interface NotificationResponse {
  notificationId: string;
  roomId: string;
  chatId: number;
  title: string;
  preview: string;
  deeplink: string;
  read: boolean;
  createdAt: string;
}

export interface ChatRoomJoinResponse {
  message: string;
  data: {
    userId: string;
    memberId: number;
    cafeId: number;
    roomId: number;
    roomName: string;
    type: string;
    muted: boolean;
    maxCapacity: number;
    currentMembers: number;
    joinedAt: string;
    alreadyJoined: boolean;
  };
}

// 1:1 채팅방 생성 응답 타입
export interface DmChatJoinResponse {
  message: string;
  data: {
    userId: string;
    memberId: number;
    roomId: number;
    type: string;
    muted: boolean;
    joinedAt: string;
    alreadyJoined: boolean;
  };
}

// 채팅방 참여자 타입
export interface ChatParticipant {
  userId: string;
  nickname: string;
  profileImage?: string | null;
  me: boolean;
  muted?: boolean;
}

// 채팅 메시지 타입
export interface ChatMessageResponse {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isMyMessage?: boolean;
}

// 채팅 히스토리 메시지 타입 (API 응답)
export interface ChatHistoryMessage {
  chatId: number;
  roomId: number;
  message: string;
  senderNickname: string;
  timeLabel: string;
  mine: boolean;
  messageType: "TEXT" | "SYSTEM" | string;
  createdAt: string;
  othersUnreadUsers?: number;
  images?: Array<{
    imageId: number;
    originalFileName: string;
    imageUrl: string;
  }>;
}

// 채팅 히스토리 응답 타입 (커서 페이징)
export interface ChatHistoryResponse {
  message: string;
  data: {
    content: ChatHistoryMessage[];
    hasNext: boolean;
    nextCursor?: string;
  };
}

// 채팅방 정보 타입
export interface ChatRoomInfo {
  roomId: string;
  cafeId: string;
  cafeName: string;
  participants: ChatParticipant[];
  participantCount: number;
}

/**
 * 카페 ID로 채팅방 ID 조회
 * GET /api/chat/rooms/cafe/:cafeId
 */
export const getChatRoomIdByCafeId = async (
  cafeId: string
): Promise<{ roomId: string }> => {
  if (DEMO_MODE) return { roomId: String(Number(cafeId) + 100) };
  try {
    const response = await apiClient.get(`/api/chat/rooms/cafe/${cafeId}`);
    return response.data;
  } catch (error: any) {
    console.error("채팅방 ID 조회 실패:", error);

    // 403 Forbidden인 경우도 기본값 반환 (이미 참여 중일 수 있음)
    if (
      error.response?.status === 403 ||
      error.response?.status === 404 ||
      error.response?.status === 500
    ) {
      // 데이터베이스 테이블 기반 매핑 (임시 하드코딩)
      const cafeToRoomMapping: { [key: string]: string } = {};
      const roomId = cafeToRoomMapping[cafeId] || "1"; // 기본값
      return { roomId };
    }

    // 에러 발생 시 기본값 반환
    return { roomId: "1" };
  }
};

// 요청 중복 방지를 위한 Map
const pendingRequests = new Map<string, Promise<ChatRoomJoinResponse>>();

// 사용자 인증 상태 확인
async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.error("토큰이 없습니다");
      return false;
    }

    await apiClient.get("/api/auth/me");
    return true;
  } catch (error) {
    console.error("인증 상태 확인 실패:", error);
    return false;
  }
}

/**
 * 카페 단체 채팅방 생성 + 가입
 * POST /api/chat/rooms/group/:cafeId/join
 */
export const joinCafeGroupChat = async (
  cafeId: string,
  retryCount = 0
): Promise<ChatRoomJoinResponse> => {
  if (DEMO_MODE) return demoJoinGroupRoom(cafeId) as ChatRoomJoinResponse;
  // 중복 요청 방지
  const requestKey = `${cafeId}-${retryCount}`;
  const existingRequest = pendingRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  // Promise 생성 및 Map에 저장
  const requestPromise = (async () => {
    try {
      const token = useAuthStore.getState().accessToken;

      // 카페 ID 유효성 검사
      const parsedCafeId = parseInt(cafeId);
      if (isNaN(parsedCafeId) || parsedCafeId <= 0) {
        throw new Error(`유효하지 않은 카페 ID: ${cafeId}`);
      }

      const response = await apiClient.post(
        `/api/chat/rooms/group/${cafeId}/join`
      );

      const responseData: ChatRoomJoinResponse = response.data;

      // 응답 데이터 검증
      if (!responseData || !responseData.data || !responseData.data.roomId) {
        console.error(
          "채팅방 참여 응답 데이터가 올바르지 않습니다:",
          responseData
        );
        throw new Error("채팅방 참여 응답 데이터가 올바르지 않습니다.");
      }

      // 요청 완료 후 Map에서 제거
      pendingRequests.delete(requestKey);

      return responseData;
    } catch (error: any) {
      console.error("카페 단체 채팅방 가입 실패:", error);

      // 에러 발생 시에도 Map에서 제거
      pendingRequests.delete(requestKey);

      // 에러 정보 추출
      const errorData = error.response?.data || {};
      const status = error.response?.status;
      const errorMessage = errorData.message || error.message;

      // 400 에러인 경우 더 자세한 정보 제공
      if (status === 400) {
        console.error("400 Bad Request - 요청 데이터 확인 필요:", {
          cafeId,
          cafeIdType: typeof cafeId,
          cafeIdParsed: parseInt(cafeId),
          isNaN: isNaN(parseInt(cafeId)),
          errorMessage: errorMessage || "상세 정보 없음",
        });

        // "가입 상태 조회 실패" 에러인 경우 특별 처리
        if (errorMessage && errorMessage.includes("가입 상태 조회 실패")) {
          console.error(
            "가입 상태 조회 실패 - 사용자 인증 또는 권한 문제일 수 있음"
          );

          // 토큰 갱신은 axios 인터셉터에서 자동 처리되므로 재시도만 수행
          if (retryCount === 0) {
            const isAuthValid = await checkAuthStatus();
            if (isAuthValid) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return joinCafeGroupChat(cafeId, retryCount + 1);
            }
          }
        }

        // Hibernate 엔티티 ID null 에러 처리
        if (
          errorMessage &&
          (errorMessage.includes("has a null identifier") ||
            errorMessage.includes("ChatRoomEntity"))
        ) {
          console.error(
            "Hibernate 엔티티 ID null 에러 - 백엔드 데이터베이스 문제"
          );

          if (retryCount === 0) {
            const isAuthValid = await checkAuthStatus();
            if (isAuthValid) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              return joinCafeGroupChat(cafeId, retryCount + 1);
            }
          }
        }
      }

      // 데드락 에러인 경우 재시도 (최대 2번)
      if (errorMessage && errorMessage.includes("Deadlock") && retryCount < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return joinCafeGroupChat(cafeId, retryCount + 1);
      }

      throw normalizeError(error, {
        action: "joinCafeGroupChat",
        cafeId,
        retryCount,
      });
    }
  })();

  // Promise를 Map에 저장
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
};

/**
 * 채팅방 참여자 목록 조회
 * GET /api/chat/rooms/:roomId/participants
 */
export const getChatParticipants = async (
  roomId: string
): Promise<ChatParticipant[]> => {
  if (DEMO_MODE) return demoParticipants(roomId);
  try {
    const response = await apiClient.get(`/api/chat/rooms/${roomId}/members`);
    return response.data?.data || response.data || [];
  } catch (error: any) {
    console.error("채팅방 참여자 목록 조회 실패:", error);

    // 400, 403, 404, 500 에러인 경우 빈 배열 반환 (무한 재시도 방지)
    const status = error.response?.status;
    if (status === 400 || status === 403 || status === 404 || status === 500) {
      return [];
    }

    // 에러 발생 시 빈 배열 반환하여 무한 재시도 방지
    return [];
  }
};

/**
 * 읽지 않은 알림 목록 조회
 * GET /api/notifications/unread
 */
export const getUnreadNotifications = async (): Promise<
  NotificationResponse[]
> => {
  if (DEMO_MODE) return [];
  try {
    const token = useAuthStore.getState().accessToken;

    // 토큰이 없으면 빈 배열 반환 (인증되지 않은 사용자)
    if (!token) {
      return [];
    }

    const response = await apiClient.get("/api/notifications/unread");
    const data = response.data;

    // 응답 구조 확인 및 데이터 추출
    let notifications: NotificationResponse[] = [];

    if (data && typeof data === "object") {
      if (Array.isArray(data)) {
        // 배열로 직접 반환된 경우
        notifications = data;
      } else if (data.data && Array.isArray(data.data)) {
        // { message: "...", data: [...] } 구조인 경우
        notifications = data.data;
      } else {
        return [];
      }
    }

    // 나간 단체 채팅방 알림 필터링
    const filteredNotifications = notifications.filter(
      (notification: NotificationResponse) => {
        // deeplink에서 roomId 추출 (예: /mypage/chats?roomId=9)
        if (notification.deeplink && notification.deeplink.includes("/chats")) {
          const match = notification.deeplink.match(/roomId=(\d+)/);
          if (match) {
            const notificationRoomId = match[1];

            const leftRooms = useChatPreferencesStore.getState().leftRooms;
            const hasLeft = Object.values(leftRooms).some((info) => {
              if (!info || !info.roomId) {
                return false;
              }
              return (
                String(info.roomId) === notificationRoomId ||
                Number(info.roomId) === Number(notificationRoomId)
              );
            });
            if (hasLeft) {
              return false;
            }
          }
        }
        return true; // 유지
      }
    );

    return filteredNotifications;
  } catch (error: any) {
    console.error("알림 목록 조회 실패:", error);

    // 403 Forbidden, 404, 500 에러인 경우 빈 배열 반환 (조용히 처리)
    const status = error.response?.status;
    if (status === 403 || status === 404 || status === 500) {
      // 콘솔 에러 대신 로그만 출력 (403은 인증/권한 문제일 수 있으므로 정상 상황일 수 있음)
      if (status !== 403) {
        console.error("알림 목록 조회 API 에러:", status);
      }
      return [];
    }

    return [];
  }
};

/**
 * 채팅 읽음 처리
 * PATCH /api/chat/rooms/:roomId/members/me/read
 */
export const patchReadStatus = async (
  roomId: string,
  lastReadChatId: number
): Promise<void> => {
  try {
    await apiClient.patch(`/api/chat/rooms/${roomId}/members/me/read`, {
      lastReadChatId,
    });
  } catch (error: any) {
    console.error("읽음 처리 실패:", error);

    // 403, 404, 500 에러인 경우 무시
    const status = error.response?.status;
    if (status === 403 || status === 404 || status === 500) {
      return;
    }

    // 읽음 처리 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
};

/**
 * 채팅 메시지 전송 (데드락 에러 재시도 포함)
 * POST /api/chat/rooms/:roomId/messages
 */
export const sendChatMessage = async (
  roomId: string,
  content: string,
  retryCount = 0
): Promise<ChatMessageResponse> => {
  if (DEMO_MODE) {
    const created = demoSendMessage(roomId, content);
    return {
      messageId: `${created.chatId}`,
      senderId: "guest-user",
      senderName: "게스트",
      content,
      timestamp: created.createdAt,
      isMyMessage: true,
    };
  }
  try {
    const response = await apiClient.post(
      `/api/chat/rooms/${roomId}/messages`,
      { content }
    );
    return response.data;
  } catch (error: any) {
    // 데드락 에러인 경우 재시도 (최대 5번, 더 긴 대기 시간)
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "";

    if (status === 500 && retryCount < 5) {
      const isDeadlockError =
        errorMessage.includes("Deadlock") ||
        errorMessage.includes("LockAcquisitionException") ||
        errorMessage.includes("could not execute statement") ||
        errorMessage.includes("서버 내부 오류") ||
        errorMessage.includes("Internal Server Error");

      if (isDeadlockError) {
        // 더 긴 지수 백오프: 2초, 4초, 8초, 16초, 32초 대기
        const delay = Math.pow(2, retryCount + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return sendChatMessage(roomId, content, retryCount + 1);
      }
    }

    console.error("채팅 메시지 전송 실패:", error);
    throw error;
  }
};

/**
 * 채팅방 메시지 목록 조회
 * GET /api/chat/rooms/:roomId/messages
 */
export const getChatMessages = async (
  roomId: string
): Promise<ChatMessageResponse[]> => {
  if (DEMO_MODE) {
    return demoHistory(roomId, undefined, 30).data.content.map((m) => ({
      messageId: String(m.chatId),
      senderId: m.senderNickname,
      senderName: m.senderNickname,
      content: m.message,
      timestamp: m.createdAt,
      isMyMessage: m.mine,
    }));
  }
  try {
    const response = await apiClient.get(`/api/chat/rooms/${roomId}/messages`);
    return response.data;
  } catch (error) {
    console.error("채팅 메시지 목록 조회 실패:", error);
    throw error;
  }
};

/**
 * 채팅방 나가기
 * DELETE /api/chat/rooms/:roomId/leave
 */
export const leaveChatRoom = async (roomId: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/chat/rooms/${roomId}/leave`);
  } catch (error) {
    console.error("채팅방 나가기 실패:", error);
    throw error;
  }
};

/**
 * 채팅 히스토리 조회 (커서 페이징)
 * GET /api/chat/rooms/{roomId}/messages?beforeId={id}&size=50&includeSystem=true
 */
export const getChatHistory = async (
  roomId: string,
  beforeId?: string,
  size: number = 50,
  includeSystem: boolean = true
): Promise<ChatHistoryResponse> => {
  if (DEMO_MODE) return demoHistory(roomId, beforeId, size) as ChatHistoryResponse;
  try {
    const token = useAuthStore.getState().accessToken;

    // 토큰이 없으면 빈 히스토리 반환 (무한 재시도 방지)
    if (!token) {
      console.warn("채팅 히스토리 조회: 인증 토큰이 없습니다.");
      return {
        message: "인증이 필요합니다",
        data: {
          content: [],
          hasNext: false,
          nextCursor: undefined,
        },
      };
    }

    const response = await apiClient.get(`/api/chat/rooms/${roomId}/messages`, {
      params: {
        beforeId,
        size,
        includeSystem,
      },
    });

    const data = response.data;

    // 응답이 빈 배열인 경우 그대로 반환
    if (
      data?.data?.items &&
      Array.isArray(data.data.items) &&
      data.data.items.length === 0
    ) {
    }

    return data;
  } catch (error: any) {
    console.error("채팅 히스토리 조회 실패:", error);

    // 400, 403, 404, 500 에러인 경우 빈 히스토리 반환 (무한 재시도 방지)
    const status = error.response?.status;
    if (status === 400 || status === 403 || status === 404 || status === 500) {
      return {
        message: "채팅 히스토리를 불러올 수 없습니다",
        data: {
          content: [],
          hasNext: false,
          nextCursor: undefined,
        },
      };
    }

    // 에러 발생 시 빈 히스토리 반환하여 무한 재시도 방지
    return {
      message: "채팅 히스토리 조회에 실패했습니다",
      data: {
        content: [],
        hasNext: false,
        nextCursor: undefined,
      },
    };
  }
};

/**
 * 채팅 읽음 처리
 * PATCH /api/chat/rooms/{roomId}/members/me/read
 */
export const patchRead = async (
  roomId: string,
  lastReadChatId: number
): Promise<void> => {
  try {
    await apiClient.patch(`/api/chat/rooms/${roomId}/members/me/read`, {
      lastReadChatId,
    });
  } catch (error) {
    console.error("채팅 읽음 처리 실패:", error);
    throw error;
  }
};

/**
 * 1:1 채팅방 생성 + 가입
 * POST /api/chat/rooms/dm/join
 */
export const createDmChat = async (
  counterpartId: string
): Promise<DmChatJoinResponse> => {
  if (DEMO_MODE) return demoJoinDmRoom(counterpartId) as DmChatJoinResponse;
  try {
    const response = await apiClient.post(
      `/api/chat/rooms/dm/join`,
      {},
      {
        params: { counterpartId },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("1:1 채팅방 생성 실패:", error);

    // 에러 정보 추출
    const status = error.response?.status;
    const errorData = error.response?.data || {};
    const errorMessage = errorData.message || error.message || "";
    let isDuplicateEntry = false;
    let extractedRoomId: string | null = null;

    // Duplicate entry 에러 감지 (이미 참여 중인 경우)
    if (
      (status === 400 || status === 500) &&
      (errorMessage.includes("Duplicate entry") ||
        errorMessage.includes("uk_crm_room_user") ||
        errorMessage.includes("chat_room_members"))
    ) {
      isDuplicateEntry = true;
      const match = errorMessage.match(/Duplicate entry ['"](\d+)-/);
      if (match && match[1]) {
        extractedRoomId = match[1];
      }
    }

    // 백엔드 세션 플러시 에러 감지
    if (
      !isDuplicateEntry &&
      (errorMessage.includes("null identifier") ||
        errorMessage.includes("session is flushed") ||
        errorMessage.includes("ChatRoomEntity"))
    ) {
      throw new Error(
        "채팅방 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    }

    // Duplicate entry 에러인 경우 특별한 에러 타입으로 throw
    if (isDuplicateEntry) {
      const duplicateError: any = new Error(
        "ALREADY_PARTICIPATING: 이미 채팅방에 참여 중입니다."
      );
      duplicateError.isDuplicateEntry = true;
      duplicateError.status = status;
      duplicateError.roomId = extractedRoomId;
      throw duplicateError;
    }

    throw error;
  }
};

/**
 * 채팅방 나가기
 * DELETE /api/chat/rooms/{roomId}/members/me/leave
 */
export const leaveChatRoomNew = async (roomId: string): Promise<void> => {
  if (DEMO_MODE) return demoLeaveRoom(roomId);
  try {
    await apiClient.delete(`/api/chat/rooms/${roomId}/members/me/leave`);
  } catch (error: any) {
    console.error("=== 채팅방 나가기 최종 에러 ===", error);

    // 404 (채팅방/멤버 없음)만 무시, 나머지는 에러 처리
    if (error.response?.status === 404) {
      return;
    }

    throw error;
  }
};

/**
 * 채팅방 알림 on/off
 * PATCH /api/chat/rooms/{roomId}/members/me/mute
 */
export const toggleChatMute = async (
  roomId: string,
  muted: boolean
): Promise<void> => {
  if (DEMO_MODE) return demoToggleMute(roomId, muted);
  try {
    await apiClient.patch(`/api/chat/rooms/${roomId}/members/me/mute`, {
      muted,
    });
  } catch (error: any) {
    console.error("채팅방 알림 설정 실패:", error);

    // 403, 404, 500 에러인 경우 무시
    const status = error.response?.status;
    if (status === 403 || status === 404 || status === 500) {
      return;
    }

    throw error;
  }
};

/**
 * 채팅방 최신 메시지 읽음 처리
 * POST /api/chat/rooms/{roomId}/members/me/read-latest
 */
export const readLatest = async (roomId: string): Promise<void> => {
  if (DEMO_MODE) return demoReadLatest(roomId);
  try {
    await apiClient.post(`/api/chat/rooms/${roomId}/members/me/read-latest`);
  } catch (error: any) {
    console.error("최신 메시지 읽음 처리 실패:", error);

    // 403, 404, 500 에러인 경우 무시
    const status = error.response?.status;
    if (status === 403 || status === 404 || status === 500 || status === 204) {
      return;
    }

    // 읽음 처리 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
};
