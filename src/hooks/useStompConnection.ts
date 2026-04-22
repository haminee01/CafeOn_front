import { useCallback, useRef, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import {
  createStompClient,
  StompSubscription,
  ChatMessage as StompChatMessage,
} from "@/lib/stompClient";
import { useAuthStore } from "@/stores/authStore";
import { ChatMessage } from "@/types/chat";

interface UseStompConnectionProps {
  roomId: string | null;
  onMessageReceived: (message: ChatMessage) => void;
  onReadReceiptReceived?: (readReceipt: {
    readerId: string;
    lastReadChatId: number;
  }) => void;
  onConnectedChange?: (connected: boolean) => void;
  scheduleReadLatest?: (roomId: string) => void;
}

interface UseStompConnectionReturn {
  stompConnected: boolean;
  connectStomp: () => Promise<void>;
  disconnectStomp: () => void;
  subscribeToRoom: (targetRoomId: string) => void;
  sendMessage: (roomId: string, content: string) => void;
  isConnected: () => boolean;
}

/**
 * STOMP 연결 및 구독 관리 Hook
 * 단일 책임: WebSocket/STOMP 연결, 구독, 메시지 발행
 */
export const useStompConnection = ({
  roomId,
  onMessageReceived,
  onReadReceiptReceived,
  onConnectedChange,
  scheduleReadLatest,
}: UseStompConnectionProps): UseStompConnectionReturn => {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const stompClientRef = useRef<Client | null>(null);
  const messageSubscriptionRef = useRef<StompSubscription | null>(null);
  const readSubscriptionRef = useRef<StompSubscription | null>(null);
  const connectedRef = useRef<boolean>(false);
  const demoRoomRef = useRef<string | null>(null);
  const demoListenerRef = useRef<((event: Event) => void) | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  const setStompConnected = useCallback(
    (value: boolean) => {
      connectedRef.current = value;
      onConnectedChange?.(value);
    },
    [onConnectedChange]
  );

  // STOMP 클라이언트 연결
  const connectStomp = useCallback(async () => {
    if (isDemoMode) {
      setStompConnected(true);
      return;
    }
    if (stompClientRef.current?.connected) {
      return;
    }

    try {
      if (!accessToken) {
        throw new Error("인증 토큰이 없습니다.");
      }
      const serverUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/stomp/chats";

      const client = createStompClient(serverUrl, accessToken);
      stompClientRef.current = client;

      client.onConnect = (frame) => {
        setStompConnected(true);
      };

      client.onStompError = (frame) => {
        console.error("STOMP 에러:", frame);
        setStompConnected(false);
      };

      client.onWebSocketError = (error) => {
        console.error("WebSocket 에러:", error);
        setStompConnected(false);
      };

      client.onDisconnect = () => {
        setStompConnected(false);
      };

      client.activate();
      stompClientRef.current = client;
    } catch (error) {
      console.error("STOMP 연결 실패:", error);
      setStompConnected(false);
    }
  }, [setStompConnected, accessToken, isDemoMode]);

  // STOMP 구독
  const subscribeToRoom = useCallback(
    (targetRoomId: string) => {
      if (isDemoMode) {
        demoRoomRef.current = targetRoomId;
        if (demoListenerRef.current) {
          window.removeEventListener("demo-chat-message", demoListenerRef.current);
        }
        demoListenerRef.current = (event: Event) => {
          const custom = event as CustomEvent;
          if (custom.detail?.roomId !== targetRoomId) return;
          onMessageReceived(custom.detail.message as any);
        };
        window.addEventListener("demo-chat-message", demoListenerRef.current);
        return;
      }
      if (!stompClientRef.current?.connected || !targetRoomId) return;

      // 현재 활성화된 roomId와 일치하는지 확인
      if (roomId && roomId !== targetRoomId) {
        console.warn(
          `⚠️ STOMP 구독 대상 roomId(${targetRoomId})가 현재 활성화된 roomId(${roomId})와 일치하지 않음. 구독 중단.`
        );
        return;
      }

      try {
        // 기존 구독 해제
        if (messageSubscriptionRef.current) {
          messageSubscriptionRef.current.unsubscribe();
          messageSubscriptionRef.current = null;
        }
        if (readSubscriptionRef.current) {
          readSubscriptionRef.current.unsubscribe();
          readSubscriptionRef.current = null;
        }

        // 메시지 스트림 구독
        const messageSubscription = stompClientRef.current.subscribe(
          `/sub/rooms/${targetRoomId}`,
          (message) => {
            try {
              const data: StompChatMessage = JSON.parse(message.body);
              onMessageReceived(data as any);

              // 시스템 메시지가 아닌 경우 자동 read-latest 호출
              const isSystem = data.messageType
                ?.toUpperCase()
                .startsWith("SYSTEM");
              if (!isSystem && targetRoomId && scheduleReadLatest) {
                scheduleReadLatest(targetRoomId);
              }
            } catch (error) {
              console.error("메시지 파싱 오류:", error);
            }
          }
        );

        messageSubscriptionRef.current = messageSubscription;

        // 읽음 영수증 스트림 구독
        if (onReadReceiptReceived) {
          const readSubscription = stompClientRef.current.subscribe(
            `/sub/rooms/${targetRoomId}/read`,
            (message) => {
              try {
                const readReceipt = JSON.parse(message.body);

                if (
                  !readReceipt ||
                  !readReceipt.readerId ||
                  typeof readReceipt.lastReadChatId !== "number"
                ) {
                  return;
                }

                onReadReceiptReceived({
                  readerId: readReceipt.readerId,
                  lastReadChatId: readReceipt.lastReadChatId,
                });
              } catch (error) {
                console.error("읽음 영수증 파싱 오류:", error);
              }
            }
          );

          readSubscriptionRef.current = readSubscription;
        }
      } catch (error) {
        console.error("STOMP 구독 실패:", error);
      }
    },
    [roomId, onMessageReceived, onReadReceiptReceived, scheduleReadLatest, isDemoMode]
  );

  // STOMP 연결 해제
  const disconnectStomp = useCallback(() => {
    if (isDemoMode) {
      if (demoListenerRef.current) {
        window.removeEventListener("demo-chat-message", demoListenerRef.current);
        demoListenerRef.current = null;
      }
      demoRoomRef.current = null;
      setStompConnected(false);
      return;
    }
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current.unsubscribe();
      messageSubscriptionRef.current = null;
    }

    if (readSubscriptionRef.current) {
      readSubscriptionRef.current.unsubscribe();
      readSubscriptionRef.current = null;
    }

    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    setStompConnected(false);
  }, [setStompConnected, isDemoMode]);

  // 메시지 전송
  const sendMessage = useCallback((targetRoomId: string, content: string) => {
    if (isDemoMode) {
      if (!targetRoomId || !content.trim()) return;
      window.dispatchEvent(
        new CustomEvent("demo-chat-message", {
          detail: {
            roomId: targetRoomId,
            message: {
              chatId: Date.now(),
              senderNickname: "게스트",
              message: content,
              mine: true,
              messageType: "TEXT",
              createdAt: new Date().toISOString(),
              othersUnreadUsers: 0,
              timeLabel: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
              images: [],
            },
          },
        })
      );
      return;
    }
    if (
      !stompClientRef.current?.connected ||
      !targetRoomId ||
      !content.trim()
    ) {
      return;
    }

    try {
      stompClientRef.current.publish({
        destination: `/pub/rooms/${targetRoomId}`,
        body: JSON.stringify({
          message: content,
          roomId: parseInt(targetRoomId),
        }),
      });
    } catch (err) {
      console.error("메시지 전송 실패:", err);
      throw err;
    }
  }, [isDemoMode]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnectStomp();
    };
  }, [disconnectStomp]);

  // 연결 상태 확인 함수
  const isConnected = useCallback(() => {
    if (isDemoMode) return connectedRef.current;
    return Boolean(stompClientRef.current?.connected);
  }, [isDemoMode]);

  return {
    stompConnected: connectedRef.current,
    connectStomp,
    disconnectStomp,
    subscribeToRoom,
    sendMessage,
    isConnected,
  };
};
