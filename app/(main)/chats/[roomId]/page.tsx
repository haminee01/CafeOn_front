"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Client, IMessage } from "@stomp/stompjs";
import {
  getChatHistory,
  patchReadStatus,
  getChatRoomIdByCafeId,
  sendChatMessage,
  readLatest,
} from "@/api/chat";
import { ChatHistoryMessage } from "@/api/chat";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import { ChatMessage } from "@/types/chat";
import { getAccessToken } from "@/stores/authStore";

function ChatPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const jump = searchParams.get("jump"); // "33" 같은 문자열

  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<number>(0);
  const stompClientRef = useRef<Client | null>(null);

  const token = getAccessToken() || "";
  const wsUrl = useMemo(() => "ws://localhost:8080/stomp/chats", []);

  // 인증 상태 확인
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      console.log("인증 토큰이 없어서 로그인 페이지로 리다이렉트");
      router.push("/login");
      return;
    }
  }, [router]);

  // 히스토리 로드
  const loadHistory = useCallback(async () => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      console.log("딥링크 채팅 페이지 - 히스토리 로드 시작:", { roomId, jump });

      const response = await getChatHistory(roomId, undefined, 50, true);
      const historyData = response.data.content || [];

      // chatId 순으로 정렬 (오래된 → 최신)
      historyData.sort(
        (a: ChatHistoryMessage, b: ChatHistoryMessage) => a.chatId - b.chatId
      );

      setChatHistory(historyData);
      setHasMoreHistory(response.data.hasNext || false);

      if (historyData.length > 0) {
        latestIdRef.current = historyData[historyData.length - 1].chatId;
      }

      console.log(`히스토리 로드 완료: ${historyData.length}개 메시지`);

      // jump가 있으면 해당 chatId로 스크롤
      if (jump) {
        setTimeout(() => {
          const targetElement = document.querySelector(
            `[data-chat-id="${jump}"]`
          );
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            console.log(`jump=${jump}로 스크롤 완료`);
          } else {
            console.log(`jump=${jump}에 해당하는 요소를 찾을 수 없음`);
          }
        }, 100);
      } else {
        // jump가 없으면 맨 아래로 스크롤
        setTimeout(() => {
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        }, 100);
      }

      // 최신을 보고 있으면 읽음 처리
      if (latestIdRef.current) {
        await readLatest(roomId);
      }
    } catch (err) {
      console.error("히스토리 로드 실패:", err);
      setError("채팅 히스토리를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, jump]);

  // STOMP 연결 및 구독
  const connectWebSocket = useCallback(() => {
    if (!roomId || !token) {
      console.log("roomId 또는 token이 없어서 WebSocket 연결 건너뜀");
      return;
    }

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: token,
      },
      heartbeatIncoming: 0,
      heartbeatOutgoing: 10000,
      debug: (str) => {
        console.log("STOMP Debug:", str);
      },
      reconnectDelay: 5000, // 5초 후 재연결 시도
    });

    client.onConnect = () => {
      setIsConnected(true);

      // 메시지 스트림 구독
      const roomSubscription = client.subscribe(
        `/sub/rooms/${roomId}`,
        (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body) as ChatHistoryMessage;

            // ChatMessage 형태로 변환
            const newMessage: ChatMessage = {
              id: data.chatId.toString(),
              senderName: data.senderNickname,
              content: data.message,
              isMyMessage: data.mine,
              senderId: data.senderNickname,
              messageType: data.messageType,
              images: data.images?.map((img) => img.imageUrl) || undefined,
              timeLabel: data.timeLabel,
              othersUnreadUsers: data.othersUnreadUsers,
              createdAt: data.createdAt,
            };

            setMessages((prev) => {
              // 중복 메시지 방지
              if (prev.find((x) => x.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            latestIdRef.current = Math.max(latestIdRef.current, data.chatId);

            // 최신을 보고 있으면 읽음 처리
            if (data.messageType === "TEXT") {
              setTimeout(() => readLatest(roomId), 400);
            }
          } catch (err) {
            console.error("메시지 파싱 실패:", err);
          }
        }
      );

      // 읽음 영수증 구독
      const readSubscription = client.subscribe(
        `/sub/rooms/${roomId}/read`,
        (msg: IMessage) => {
          try {
            const readReceipt = JSON.parse(msg.body);

            if (
              !readReceipt ||
              !readReceipt.readerId ||
              typeof readReceipt.lastReadChatId !== "number"
            ) {
              return;
            }

            // 메시지의 안읽음 카운트 감소
            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                const chatId = parseInt(msg.id) || 0;
                if (
                  chatId <= readReceipt.lastReadChatId &&
                  msg.senderId !== readReceipt.readerId
                ) {
                  const currentCount = msg.othersUnreadUsers || 0;
                  return {
                    ...msg,
                    othersUnreadUsers: Math.max(0, currentCount - 1),
                  };
                }
                return msg;
              });
            });
          } catch (err) {
            console.error("읽음 영수증 파싱 실패:", err);
          }
        }
      );

      // 개인 알림 구독
      const notificationSubscription = client.subscribe(
        `/user/queue/notifications`,
        (msg: IMessage) => {}
      );

      // 구독 정보 저장
      (client as any).__subscriptions = [
        roomSubscription,
        readSubscription,
        notificationSubscription,
      ];
    };

    client.onStompError = (frame) => {
      console.error("STOMP 에러:", frame);
      setIsConnected(false);

      // 에러 메시지 표시
      if (frame.headers && frame.headers.message) {
        setError(`WebSocket 연결 실패: ${frame.headers.message}`);
      } else {
        setError("WebSocket 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onWebSocketError = (error) => {
      console.error("WebSocket 에러:", error);
      setIsConnected(false);
      setError("WebSocket 연결에 실패했습니다.");
    };

    try {
      client.activate();
      stompClientRef.current = client;
    } catch (err) {
      console.error("STOMP 클라이언트 활성화 실패:", err);
      setError("실시간 채팅 연결에 실패했습니다.");
    }
  }, [roomId, token, wsUrl]);

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !roomId || !stompClientRef.current?.connected)
        return;

      try {
        stompClientRef.current.publish({
          destination: `/pub/rooms/${roomId}`,
          body: JSON.stringify({ message }),
        });
      } catch (err) {
        console.error("메시지 전송 실패:", err);
        setError("메시지 전송에 실패했습니다.");
      }
    },
    [roomId]
  );

  // 더 많은 히스토리 로드
  const loadMoreHistory = useCallback(async () => {
    if (!roomId || isLoadingHistory || !hasMoreHistory) return;

    setIsLoadingHistory(true);
    try {
      const beforeId =
        chatHistory.length > 0
          ? chatHistory[chatHistory.length - 1].chatId.toString()
          : undefined;

      const response = await getChatHistory(roomId, beforeId, 50, true);
      const newHistory = response.data.content || [];

      setChatHistory((prev) => [...prev, ...newHistory]);
      setHasMoreHistory(response.data.hasNext || false);
    } catch (err) {
      console.error("히스토리 추가 로드 실패:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [roomId, chatHistory, isLoadingHistory, hasMoreHistory]);

  // 읽음 처리
  const handleMarkAsRead = useCallback(async () => {
    if (!roomId) return;
    await readLatest(roomId);
  }, [roomId]);

  // 프로필 클릭 핸들러 (빈 함수)
  const handleProfileClick = () => {};

  // 초기화
  useEffect(() => {
    loadHistory();
    connectWebSocket();

    return () => {
      // 정리
      if (stompClientRef.current) {
        const subscriptions = (stompClientRef.current as any).__subscriptions;
        subscriptions?.forEach((sub: any) => sub?.unsubscribe?.());
        stompClientRef.current.deactivate();
      }
    };
  }, [loadHistory, connectWebSocket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* 채팅 헤더 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">채팅방 #{roomId}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? "연결됨" : "연결 끊김"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                뒤로가기
              </button>
            </div>
          </div>

          {/* 채팅 메시지 영역 - ChatMessageList 사용 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatMessageList
              messages={messages}
              chatHistory={chatHistory}
              hasMoreHistory={hasMoreHistory}
              isLoadingHistory={isLoadingHistory}
              onLoadMoreHistory={loadMoreHistory}
              onProfileClick={handleProfileClick}
              onListClick={() => {}}
              onMarkAsRead={handleMarkAsRead}
              roomId={roomId}
            />
          </div>

          {/* 메시지 입력 영역 - ChatMessageInput 사용 */}
          {error && (
            <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          <ChatMessageInput onSendMessage={handleSendMessage} roomId={roomId} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#6E4213] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">채팅 화면을 불러오는 중입니다.</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
