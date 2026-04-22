"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import ChatMessageItem from "./ChatMessageItem";
import { ChatMessage, ProfileClickHandler } from "@/types/chat";
import { ChatHistoryMessage } from "@/api/chat";
import { useAuth } from "@/contexts/AuthContext";
import { getChatMessagesWithUnreadCount } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface ChatMessageListProps {
  messages: ChatMessage[];
  chatHistory?: ChatHistoryMessage[];
  hasMoreHistory?: boolean;
  isLoadingHistory?: boolean;
  onProfileClick: ProfileClickHandler;
  onListClick: () => void;
  onLoadMoreHistory?: () => void;
  onMarkAsRead?: () => void;
  roomId?: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  chatHistory = [],
  hasMoreHistory = false,
  isLoadingHistory = false,
  onProfileClick,
  onListClick,
  onLoadMoreHistory,
  onMarkAsRead,
  roomId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);
  const [readStatus, setReadStatus] = useState<{ [messageId: string]: number }>(
    {}
  );
  const isUserScrollingRef = useRef(false); // 사용자가 스크롤 중인지 추적

  // ===== Run Grouping 유틸 함수들 =====
  // 분 단위 시간 키 생성 (YYYY-MM-DD HH:MM)
  const minuteKeyOf = (createdAt: string): string | null => {
    try {
      const d = new Date(createdAt);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const HH = String(d.getHours()).padStart(2, "0");
      const MM = String(d.getMinutes()).padStart(2, "0");
      return `${yy}-${mm}-${dd} ${HH}:${MM}`;
    } catch {
      return null;
    }
  };

  // 시스템 메시지 타입 체크
  const isSystemType = (messageType: string): boolean => {
    const type = (messageType || "").toString().toUpperCase();
    return type === "SYSTEM" || type.startsWith("SYSTEM_");
  };

  // Run 키 생성 (senderId|minuteKey)
  const runKeyOf = (msg: any): string | null => {
    if (isSystemType(msg.messageType || "")) return null;
    const sid = msg.senderId ? String(msg.senderId).trim() : "";
    const mk = minuteKeyOf(msg.createdAt);
    if (!sid || !mk) return null;
    return `${sid}|${mk}`;
  };

  // 자동 스크롤 - 사용자가 스크롤 중이 아닐 때만 실행
  useEffect(() => {
    // 사용자가 스크롤 중이면 자동 스크롤 안 함
    if (isUserScrollingRef.current) {
      return;
    }

    const container = containerRef.current;
    if (container) {
      // 이미 거의 맨 아래에 있을 때만 자동 스크롤
      const isNearBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 200;

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // 스크롤 이벤트 핸들러 - 사용자가 메시지를 실제로 볼 때 읽음 처리
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onMarkAsRead) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // 사용자가 스크롤 중임을 표시
      isUserScrollingRef.current = true;

      // 스크롤이 멈춘 후 0.5초 뒤에 플래그 해제
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 500);

      // 스크롤이 맨 아래에 가까우면 읽음 처리
      const isNearBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 100;

      if (isNearBottom && !hasMarkedAsRead.current) {
        hasMarkedAsRead.current = true;
        onMarkAsRead();
      }
    };

    container.addEventListener("scroll", handleScroll);

    // 초기 로드 시에도 체크
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [onMarkAsRead]);

  // 메시지가 변경될 때 읽음 처리 상태 리셋
  useEffect(() => {
    hasMarkedAsRead.current = false;
  }, [messages]);

  // 읽음 상태 조회 함수
  const fetchReadStatus = useCallback(async () => {
    if (!roomId) {
      return;
    }
    if (DEMO_MODE) {
      // 데모 모드에서는 메시지 객체의 othersUnreadUsers를 직접 사용한다.
      // 매번 저장소 재조회하면 입력 중 프리징이 발생할 수 있어 readStatus 맵 갱신을 생략한다.
      return;
    }

    try {
      const response = await getChatMessagesWithUnreadCount(roomId);

      // 응답 데이터 구조에 따라 읽음 상태 설정
      if (response.data && response.data.content) {
        const statusMap: { [messageId: string]: number } = {};

        // 각 메시지의 othersUnreadUsers 값을 사용
        response.data.content.forEach((message: any) => {
          const chatId = message.chatId.toString();
          const historyMessageId = `history-${chatId}`;

          // othersUnreadUsers가 배열인 경우 길이를 사용, 숫자인 경우 그대로 사용
          const unreadCount = Array.isArray(message.othersUnreadUsers)
            ? message.othersUnreadUsers.length
            : typeof message.othersUnreadUsers === "number"
            ? message.othersUnreadUsers
            : 0;

          // 두 가지 ID 형태 모두 매핑
          statusMap[chatId] = unreadCount;
          statusMap[historyMessageId] = unreadCount;
        });

        setReadStatus(statusMap);
      }
    } catch (error) {
      console.error("메시지 목록 조회 실패:", error);
    }
  }, [roomId]);

  // 초기 로드 시 읽음 상태 조회
  useEffect(() => {
    fetchReadStatus();
  }, [fetchReadStatus]);

  // 메시지 배열 자체 변화마다 즉시 조회하면 렌더/스토리지 부하가 커져 프리징을 유발할 수 있어
  // room 변경, 커스텀 이벤트 시점에만 조회한다.

  // 새 메시지 추가 및 읽음 처리 이벤트 감지하여 읽음 상태 업데이트
  useEffect(() => {
    if (DEMO_MODE) return;
    const handleChatMessageAdded = (event: CustomEvent) => {
      const { roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId) {
        setTimeout(() => {
          fetchReadStatus();
        }, 500);
      }
    };

    const handleChatMarkedAsRead = (event: CustomEvent) => {
      const { roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId) {
        setTimeout(() => {
          fetchReadStatus();
        }, 500);
      }
    };

    window.addEventListener(
      "chatMessageAdded",
      handleChatMessageAdded as EventListener
    );
    window.addEventListener(
      "chatMarkedAsRead",
      handleChatMarkedAsRead as EventListener
    );

    return () => {
      window.removeEventListener(
        "chatMessageAdded",
        handleChatMessageAdded as EventListener
      );
      window.removeEventListener(
        "chatMarkedAsRead",
        handleChatMarkedAsRead as EventListener
      );
    };
  }, [roomId, fetchReadStatus]);

  // useAuth 훅 사용
  const { user } = useAuth();
  const authStoreUser = useAuthStore((state) => state.user);
  const currentUserNickname = user?.username || user?.nickname || null;
  const fallbackNickname =
    authStoreUser?.nickname || authStoreUser?.username || null;

  const getMyNickname = () => currentUserNickname || fallbackNickname || null;

  // 날짜 메시지인지 확인하는 함수
  const isDateMessage = (content: string): boolean => {
    const datePattern = /^\d{4}년\s?\d{1,2}월\s?\d{1,2}일$|^\d{4}-\d{2}-\d{2}$/;
    return datePattern.test(content.trim());
  };

  // 채팅 히스토리를 ChatMessage 형태로 변환
  const historyMessages: ChatMessage[] = chatHistory.map(
    (historyMsg, index) => {
      // 내 닉네임 후보들 수집
      const myNickname = getMyNickname();

      // 입장/퇴장 시스템 메시지 패턴 처리
      const isJoinOrLeaveMessage =
        historyMsg.message.includes("님이 입장했습니다.") ||
        historyMsg.message.includes("님이 퇴장했습니다.");
      const isMyJoinOrLeave =
        isJoinOrLeaveMessage &&
        myNickname &&
        historyMsg.message.includes(myNickname);

      // 내 메시지 판정: mine 플래그, 닉네임 일치 (정규화하여 비교), 입장/퇴장 내 메시지
      const normalizedServerNickname = (historyMsg.senderNickname || "").trim();
      const normalizedMyNickname = (myNickname || "").trim();

      const isMyMessage = Boolean(
        historyMsg.mine === true ||
          (normalizedMyNickname &&
            normalizedServerNickname &&
            normalizedServerNickname === normalizedMyNickname) ||
          isMyJoinOrLeave
      );

      // 표시명은 항상 서버 닉네임 사용 (내 메시지는 표시단에서 (나)만 붙임)
      const displaySenderName = historyMsg.senderNickname;

      const convertedMessage = {
        id: `history-${historyMsg.chatId}`,
        senderName: displaySenderName,
        content: historyMsg.message,
        isMyMessage: isMyMessage,
        senderId: historyMsg.senderNickname, // 임시로 nickname을 ID로 사용
        messageType: historyMsg.messageType,
        images: historyMsg.images?.map((img) => img.imageUrl) || undefined,
        timeLabel: historyMsg.timeLabel,
        othersUnreadUsers: (historyMsg as any).othersUnreadUsers,
        createdAt: historyMsg.createdAt,
      };

      return convertedMessage;
    }
  );

  // 히스토리와 실시간 메시지를 합치되 중복 제거
  const allMessages = React.useMemo(() => {
    const messageMap = new Map<string, ChatMessage>();

    const normalizeId = (id: string): string => {
      return id.replace("history-", "").replace("temp-", "");
    };

    // 히스토리 메시지 먼저 추가 (날짜 메시지 포함)
    historyMessages.forEach((msg) => {
      const normalizedId = normalizeId(msg.id);
      if (!messageMap.has(normalizedId)) {
        messageMap.set(normalizedId, msg);
      }
    });

    // 실시간 메시지 추가 (중복되지 않는 것만, 날짜 메시지 포함)
    messages.forEach((msg) => {
      const normalizedId = normalizeId(msg.id);
      if (!messageMap.has(normalizedId)) {
        messageMap.set(normalizedId, msg);
      }
    });

    // 시간순으로 정렬 (오래된 메시지부터 최신 메시지 순)
    return Array.from(messageMap.values()).sort((a, b) => {
      // 메시지 ID에서 시간 정보 추출 (chatId는 시간순으로 증가)
      const aId = normalizeId(a.id);
      const bId = normalizeId(b.id);

      // 숫자로 변환하여 비교 (오래된 메시지가 먼저)
      const aNum = parseInt(aId) || 0;
      const bNum = parseInt(bId) || 0;

      return aNum - bNum;
    });
  }, [historyMessages, messages]);

  // 모든 메시지가 비어있는지 확인 (로딩 중이 아닐 때만)
  const hasNoMessages = allMessages.length === 0 && !isLoadingHistory;

  // Run Grouping: 같은 senderId + 같은 분(minute) 단위로 그룹핑
  const groupedMessages = React.useMemo(() => {
    // 분(minute) 키 생성 함수
    const minuteKeyOf = (createdAt: string): string | null => {
      try {
        const d = new Date(createdAt);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const HH = String(d.getHours()).padStart(2, "0");
        const MM = String(d.getMinutes()).padStart(2, "0");
        return `${yy}-${mm}-${dd} ${HH}:${MM}`;
      } catch {
        return null;
      }
    };

    // 시스템 메시지 체크
    const isSystemType = (messageType?: string): boolean => {
      if (!messageType) return false;
      const type = messageType.toUpperCase();
      return type === "SYSTEM" || type.startsWith("SYSTEM_");
    };

    // Run 키 생성: senderId|minuteKey
    const runKeyOf = (msg: ChatMessage): string | null => {
      if (isSystemType(msg.messageType)) return null;
      const sid = msg.senderId ? String(msg.senderId).trim() : "";
      const mk = minuteKeyOf(msg.createdAt || "");
      if (!sid || !mk) return null;
      return `${sid}|${mk}`;
    };

    // 메시지에 Run Grouping 정보 추가
    const messagesWithGrouping = allMessages.map((msg, index) => {
      const currentRunKey = runKeyOf(msg);
      const prevRunKey = index > 0 ? runKeyOf(allMessages[index - 1]) : null;
      const nextRunKey =
        index < allMessages.length - 1
          ? runKeyOf(allMessages[index + 1])
          : null;

      // 그룹 내 첫 메시지인지 (이전 메시지와 runKey가 다름)
      const isFirstInRun = currentRunKey !== prevRunKey;
      // 그룹 내 마지막 메시지인지 (다음 메시지와 runKey가 다름)
      const isLastInRun = currentRunKey !== nextRunKey;

      return {
        ...msg,
        showNickname: isFirstInRun || !currentRunKey,
        showTimestamp: isLastInRun || !currentRunKey,
      };
    });

    return messagesWithGrouping;
  }, [allMessages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-50 border-y"
      onClick={onListClick}
    >
      {/* 더 많은 히스토리 로드 버튼 - 메시지가 있을 때만 표시 */}
      {hasMoreHistory && onLoadMoreHistory && !hasNoMessages && (
        <div className="flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLoadMoreHistory();
            }}
            disabled={isLoadingHistory}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingHistory ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                <span>로딩 중...</span>
              </div>
            ) : (
              "이전 메시지 더 보기"
            )}
          </button>
        </div>
      )}

      {/* 로딩 중일 때 로딩 메시지 표시 */}
      {isLoadingHistory && allMessages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <div className="text-center text-gray-500 text-sm">
            <div className="mb-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            </div>
            <p>채팅 기록을 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 메시지가 없을 때 입장 메시지 표시 (로딩 중이 아닐 때만) */}
      {hasNoMessages && (
        <div className="flex justify-center items-center h-full">
          <div className="text-center text-gray-500 text-sm">
            <div className="mb-2">
              <svg
                className="w-8 h-8 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p>채팅방에 입장했습니다.</p>
            <p className="text-xs mt-1">첫 메시지를 보내보세요!</p>
          </div>
        </div>
      )}

      {/* 통합된 메시지 리스트 (Run Grouping 적용) */}
      {groupedMessages.map((message) => {
        const messageId = message.id;
        const normalizedId = messageId.replace("history-", "");
        const unreadCount =
          message.othersUnreadUsers ??
          readStatus[normalizedId] ??
          readStatus[messageId] ??
          0;

        return (
          <ChatMessageItem
            key={messageId}
            message={message}
            onProfileClick={onProfileClick}
            unreadCount={unreadCount}
            showTimestamp={message.showTimestamp}
            showNickname={message.showNickname}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;
