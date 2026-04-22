import { useEffect, useCallback, useRef, useMemo } from "react";
import {
  createDmChat,
  getChatParticipants,
  getChatHistory,
  leaveChatRoomNew,
  readLatest,
  ChatParticipant,
  ChatHistoryMessage,
} from "@/api/chat";
import { ChatMessage, Participant } from "@/types/chat";
import {
  setDmChatMapping,
  getRoomIdByCounterpart,
  removeDmChatMapping,
  removeInvalidMappings,
} from "@/utils/dmChatMapping";
import {
  useChatStore,
  createDmChatSessionState,
  DmSessionUpdater,
} from "@/stores/chatStore";
import { useChatPreferencesStore } from "@/stores/chatPreferencesStore";
import { useAuth } from "@/contexts/AuthContext";
import { useStompConnection } from "./useStompConnection";
import { useChatMessages } from "./useChatMessages";
import { useChatParticipants } from "./useChatParticipants";
import { useChatReadStatus } from "./useChatReadStatus";
import { useChatMute } from "./useChatMute";

interface UseDmChatProps {
  counterpartId: string;
  counterpartName: string;
  existingRoomId?: string; // 마이페이지에서 이미 존재하는 채팅방의 roomId
}

interface UseDmChatReturn {
  // 채팅방 상태
  roomId: string | null;
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;

  // 참여자 관련
  participants: Participant[];
  participantCount: number;

  // 메시지 관련
  messages: ChatMessage[];
  chatHistory: ChatHistoryMessage[];
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;

  // 알림 관련
  isMuted: boolean;

  // STOMP 연결 상태
  stompConnected: boolean;

  // 액션 함수들
  joinChat: () => Promise<void>;
  leaveChat: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  refreshParticipants: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  toggleMute: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

export const useDmChat = ({
  counterpartId,
  counterpartName,
  existingRoomId,
}: UseDmChatProps): UseDmChatReturn => {
  // 기본 상태 - selector는 store에서 직접 가져오기만 함 (기본값은 initDmSession에서 처리)
  const sessionKey = existingRoomId || counterpartId || "dm-default";
  const session = useChatStore((state) => state.dmSessions[sessionKey]);
  const initDmSession = useChatStore((state) => state.initDmSession);
  const patchDmSession = useChatStore((state) => state.patchDmSession);
  const resetDmSession = useChatStore((state) => state.resetDmSession);

  useEffect(() => {
    initDmSession(sessionKey);
    return () => resetDmSession(sessionKey);
  }, [sessionKey, initDmSession, resetDmSession]);

  const updateSession = useCallback(
    (updater: DmSessionUpdater) => patchDmSession(sessionKey, updater),
    [sessionKey, patchDmSession]
  );

  // 상태 업데이트 함수들
  const setRoomId = useCallback(
    (value: string | null) => updateSession({ roomId: value }),
    [updateSession]
  );
  const setIsJoined = useCallback(
    (value: boolean) => updateSession({ isJoined: value }),
    [updateSession]
  );
  const setIsLoading = useCallback(
    (value: boolean) => updateSession({ isLoading: value }),
    [updateSession]
  );
  const setError = useCallback(
    (value: string | null) => updateSession({ error: value }),
    [updateSession]
  );
  const setParticipants = useCallback(
    (updater: Participant[] | ((prev: Participant[]) => Participant[])) =>
      updateSession((prev) => ({
        ...prev,
        participants:
          typeof updater === "function" ? updater(prev.participants) : updater,
      })),
    [updateSession]
  );
  const setParticipantCount = useCallback(
    (value: number) => updateSession({ participantCount: value }),
    [updateSession]
  );
  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) =>
      updateSession((prev) => ({
        ...prev,
        messages:
          typeof updater === "function" ? updater(prev.messages) : updater,
      })),
    [updateSession]
  );
  const setChatHistory = useCallback(
    (
      updater:
        | ChatHistoryMessage[]
        | ((prev: ChatHistoryMessage[]) => ChatHistoryMessage[])
    ) =>
      updateSession((prev) => ({
        ...prev,
        chatHistory:
          typeof updater === "function" ? updater(prev.chatHistory) : updater,
      })),
    [updateSession]
  );
  const setHasMoreHistory = useCallback(
    (value: boolean) => updateSession({ hasMoreHistory: value }),
    [updateSession]
  );
  const setIsLoadingHistory = useCallback(
    (value: boolean) => updateSession({ isLoadingHistory: value }),
    [updateSession]
  );
  const setIsMuted = useCallback(
    (value: boolean) => updateSession({ isMuted: value }),
    [updateSession]
  );
  const setStompConnected = useCallback(
    (value: boolean) => updateSession({ stompConnected: value }),
    [updateSession]
  );

  // session이 없으면 기본값 사용 (initDmSession이 호출되기 전일 수 있음)
  // useMemo로 캐싱하여 매번 새로 생성되지 않도록 함
  const defaultSession = useMemo(() => createDmChatSessionState(), []);
  const {
    roomId,
    isJoined,
    isLoading,
    error,
    participants,
    participantCount,
    messages,
    chatHistory,
    hasMoreHistory,
    isLoadingHistory,
    isMuted,
    stompConnected,
  } = session ?? defaultSession;

  // 인증 관련
  const { user, currentUserId } = useAuth();
  const currentUserNickname = user?.username || null;

  // 참여자 관리 Hook
  const { refreshParticipants } = useChatParticipants({
    roomId,
    isCafeChat: false,
    onParticipantsChange: (updater) => {
      setParticipants(updater);
      // participantCount도 함께 업데이트
      const newParticipants =
        typeof updater === "function" ? updater(participants) : updater;
      setParticipantCount(newParticipants.length);
    },
    onMutedChange: setIsMuted,
  });

  // 읽음 상태 관리 Hook
  const { scheduleReadLatest, markAsRead } = useChatReadStatus({
    roomId,
    messages,
    chatHistory,
    onMessagesUpdate: setMessages,
    onChatHistoryUpdate: setChatHistory,
  });

  // 메시지 관리 Hook
  const { loadMoreHistory, handleStompMessage, handleReadReceipt } =
    useChatMessages({
      roomId,
      messages,
      chatHistory,
      hasMoreHistory,
      isLoadingHistory,
      onMessagesChange: setMessages,
      onChatHistoryChange: setChatHistory,
      onHasMoreHistoryChange: setHasMoreHistory,
      onIsLoadingHistoryChange: setIsLoadingHistory,
      isCafeChat: false,
    });

  // STOMP 연결 관리 Hook
  const {
    stompConnected: stompConnectedState,
    connectStomp,
    disconnectStomp,
    subscribeToRoom,
    sendMessage: stompSendMessage,
  } = useStompConnection({
    roomId,
    onMessageReceived: handleStompMessage,
    onReadReceiptReceived: handleReadReceipt,
    onConnectedChange: setStompConnected,
    scheduleReadLatest,
  });

  // 알림 관리 Hook
  const { toggleMute } = useChatMute({
    roomId,
    isMuted,
    isCafeChat: false,
    onMutedChange: setIsMuted,
  });

  // joinChat 중복 호출 방지를 위한 ref
  const joinedCounterpartRef = useRef<string | null>(null);
  const previousExistingRoomIdRef = useRef<string | undefined>(undefined);
  const lastLoadedRoomIdRef = useRef<string | null>(null); // 히스토리를 로드한 마지막 roomId 추적

  // 채팅방 나가기 관련
  const getRoomLeftPref = useChatPreferencesStore((state) => state.getRoomLeft);
  const markRoomLeftPref = useChatPreferencesStore(
    (state) => state.markRoomLeft
  );
  const clearRoomLeftPref = useChatPreferencesStore(
    (state) => state.clearRoomLeft
  );

  // 1:1 채팅방 참여
  const joinChat = useCallback(async () => {
    // 로딩 중이면 중복 호출 방지
    if (isLoading) {
      return;
    }

    // 마이페이지에서 이미 존재하는 채팅방인 경우,
    // 이 roomId에 대해 이미 히스토리를 로드했고 messages도 있는 경우에만 중복 호출 방지
    // (채팅방 전환 시 히스토리를 다시 로드해야 하므로 이 조건을 엄격하게)
    if (
      existingRoomId &&
      isJoined &&
      roomId === existingRoomId &&
      lastLoadedRoomIdRef.current === existingRoomId &&
      chatHistory.length > 0 &&
      messages.length > 0
    ) {
      return;
    }

    // 이전 채팅방이 있고 새로운 채팅방으로 전환하는 경우 정리
    if (roomId && existingRoomId && roomId !== existingRoomId) {
      setMessages([]);
      setChatHistory([]);
      setParticipants([]);
      setParticipantCount(0);
      setRoomId(null);
      setIsJoined(false);
    }

    // 마이페이지에서 이미 존재하는 채팅방인 경우
    if (existingRoomId) {
      setIsLoading(true);
      setError(null);

      setMessages([]);
      setChatHistory([]);
      setParticipants([]);
      setParticipantCount(0);

      setRoomId(existingRoomId);
      setIsJoined(true);

      try {
        const participantsResponse = await getChatParticipants(existingRoomId);
        const participantList: Participant[] = participantsResponse.map(
          (p: ChatParticipant) => ({
            id: p.userId,
            name: p.nickname,
          })
        );
        setParticipants(participantList);
        setParticipantCount(participantList.length);

        const targetRoomIdForExisting = existingRoomId;
        setTimeout(() => {
          if (roomId === targetRoomIdForExisting) {
            refreshParticipants();
          }
        }, 100);

        const leftKey = `dm_${counterpartId || existingRoomId || "default"}`;
        const leftInfo = getRoomLeftPref(leftKey);

        if (leftInfo) {
          clearRoomLeftPref(leftKey);
          setChatHistory([]);
          setHasMoreHistory(false);
          setMessages([]);
          lastLoadedRoomIdRef.current = existingRoomId;
        } else {
          const historyResponse = await getChatHistory(existingRoomId);
          if (historyResponse.data.content.length > 0) {
            setChatHistory(historyResponse.data.content);
            setHasMoreHistory(historyResponse.data.hasNext);

            // 히스토리를 messages로 변환하여 표시
            const historyMessages: ChatMessage[] =
              historyResponse.data.content.map((msg: ChatHistoryMessage) => ({
                id: msg.chatId.toString(),
                senderName: msg.senderNickname,
                content: msg.message,
                isMyMessage: msg.mine,
                senderId: msg.senderNickname,
                messageType: msg.messageType,
                images: msg.images?.map((img) => img.imageUrl) || undefined,
                timeLabel: msg.timeLabel,
                othersUnreadUsers: msg.othersUnreadUsers,
                createdAt: msg.createdAt,
              }));
            setMessages(historyMessages);
            // 히스토리 로드 완료 추적 (비동기 완료 후 설정)
            setTimeout(() => {
              lastLoadedRoomIdRef.current = existingRoomId;
            }, 0);
          } else {
            setChatHistory([]);
            setHasMoreHistory(false);
            setMessages([]);
            lastLoadedRoomIdRef.current = existingRoomId;
          }
        }

        await connectStomp();

        setTimeout(async () => {
          try {
            await readLatest(existingRoomId);

            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (!msg.isMyMessage) {
                  const currentCount = msg.othersUnreadUsers || 0;
                  const newCount = Math.max(0, currentCount - 1);
                  return {
                    ...msg,
                    othersUnreadUsers: newCount,
                  };
                }
                return msg;
              });
            });
          } catch (err) {}
        }, 1000);

        setIsLoading(false);
        return;
      } catch (err) {
        setError("채팅방 로드에 실패했습니다.");
        setIsLoading(false);
        return;
      }
    }

    // counterpartId 유효성 검사
    if (
      !counterpartId ||
      counterpartId.trim() === "" ||
      counterpartId === "user-me" ||
      counterpartId === "user-1"
    ) {
      const errorMsg = `유효하지 않은 상대방 ID: ${counterpartId}`;
      setError(errorMsg);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!existingRoomId) {
      setChatHistory([]);
      setMessages([]);
      setHasMoreHistory(true);
    }

    try {
      removeInvalidMappings();

      let existingRoomIdFromMapping = getRoomIdByCounterpart(counterpartId);

      if (existingRoomIdFromMapping) {
        setRoomId(existingRoomIdFromMapping.toString());
        setIsJoined(true);

        try {
          const participantsResponse = await getChatParticipants(
            existingRoomIdFromMapping.toString()
          );
          const participantList: Participant[] = participantsResponse.map(
            (p: ChatParticipant) => ({
              id: p.userId,
              name: p.nickname,
            })
          );
          setParticipants(participantList);
          setParticipantCount(participantList.length);

          const targetRoomId = existingRoomIdFromMapping.toString();
          setTimeout(() => {
            if (roomId === targetRoomId) {
              refreshParticipants();
            }
          }, 100);

          const leftKey = `dm_${counterpartId}`;
          const leftInfo = getRoomLeftPref(leftKey);

          let hasJoinMessage = false;

          if (leftInfo) {
            clearRoomLeftPref(leftKey);
            setChatHistory([]);
            setHasMoreHistory(false);
            setMessages([]);
          } else {
            const historyResponse = await getChatHistory(
              existingRoomIdFromMapping.toString()
            );
            if (historyResponse.data.content.length > 0) {
              hasJoinMessage = historyResponse.data.content.some((msg) =>
                msg.message.includes("님이 입장했습니다.")
              );

              setChatHistory(historyResponse.data.content);
              setHasMoreHistory(historyResponse.data.hasNext);

              const historyMessages: ChatMessage[] =
                historyResponse.data.content.map((msg: ChatHistoryMessage) => ({
                  id: msg.chatId.toString(),
                  senderName: msg.senderNickname,
                  content: msg.message,
                  isMyMessage: msg.mine,
                  senderId: msg.senderNickname,
                  messageType: msg.messageType,
                  images: msg.images?.map((img) => img.imageUrl) || undefined,
                  timeLabel: msg.timeLabel,
                  othersUnreadUsers: msg.othersUnreadUsers,
                  createdAt: msg.createdAt,
                }));
              setMessages(historyMessages);
            } else {
              setMessages([]);
            }
          }

          if (
            !hasJoinMessage &&
            currentUserNickname &&
            existingRoomIdFromMapping
          ) {
            const roomIdForMessage = existingRoomIdFromMapping.toString();
            setTimeout(() => {
              stompSendMessage(
                roomIdForMessage,
                `${currentUserNickname}님이 입장했습니다.`
              );
            }, 300);
          }
        } catch (dataLoadError) {}

        try {
          await connectStomp();

          const roomIdForRead = existingRoomIdFromMapping?.toString();
          if (roomIdForRead) {
            setTimeout(async () => {
              try {
                await readLatest(roomIdForRead);

                setMessages((prevMessages) => {
                  return prevMessages.map((msg) => {
                    if (!msg.isMyMessage) {
                      const currentCount = msg.othersUnreadUsers || 0;
                      const newCount = Math.max(0, currentCount - 1);
                      return {
                        ...msg,
                        othersUnreadUsers: newCount,
                      };
                    }
                    return msg;
                  });
                });
              } catch (err) {}
            }, 1000);
          }
        } catch (stompError) {}
        return;
      }

      // createDmChat API 호출
      let response;
      let newRoomId: string | null = null;

      try {
        response = await createDmChat(counterpartId);
        if (response.data.roomId === 1) {
          throw new Error(
            "백엔드에서 잘못된 roomId(1)를 반환했습니다. counterpartId를 확인해주세요."
          );
        }
        newRoomId = response.data.roomId.toString();
      } catch (createError: any) {
        if (createError?.isDuplicateEntry) {
          if (createError.roomId) {
            newRoomId = createError.roomId;
          } else {
            const existingRoomIdFromMapping =
              getRoomIdByCounterpart(counterpartId);
            if (existingRoomIdFromMapping) {
              newRoomId = existingRoomIdFromMapping.toString();
            }
          }

          if (!newRoomId) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            const retryRoomId = getRoomIdByCounterpart(counterpartId);
            if (retryRoomId) {
              newRoomId = retryRoomId.toString();
            }
          }

          if (!newRoomId) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const finalRetryRoomId = getRoomIdByCounterpart(counterpartId);
            if (finalRetryRoomId) {
              newRoomId = finalRetryRoomId.toString();
            }
          }

          if (newRoomId) {
            response = {
              data: { roomId: parseInt(newRoomId) },
            };

            setError(null);
            setDmChatMapping(counterpartId, parseInt(newRoomId));
          } else {
            console.error("=== Duplicate entry인데 roomId를 찾을 수 없음 ===");
            setError(
              "채팅방이 이미 열려 있습니다. 채팅방을 완전히 나간 후 다시 시도해주세요."
            );
            setIsLoading(false);
            return;
          }
        } else {
          throw createError;
        }
      }

      if (!newRoomId) {
        throw new Error("채팅방 ID를 가져올 수 없습니다.");
      }

      setRoomId(newRoomId);
      setIsJoined(true);

      try {
        const participantsResponse = await getChatParticipants(newRoomId);
        const participantList: Participant[] = participantsResponse.map(
          (p: ChatParticipant) => ({
            id: p.userId,
            name: p.nickname,
          })
        );
        setParticipants(participantList);
        setParticipantCount(participantList.length);

        const targetRoomIdForNew = newRoomId;
        setTimeout(() => {
          if (roomId === targetRoomIdForNew) {
            refreshParticipants();
          }
        }, 100);
      } catch (e) {}

      setDmChatMapping(counterpartId, parseInt(newRoomId));

      await connectStomp();
      if (response.data.roomId) {
        subscribeToRoom(response.data.roomId.toString());
      }

      const newRoomIdStr = newRoomId;
      if (newRoomIdStr) {
        setTimeout(async () => {
          try {
            await readLatest(newRoomIdStr);

            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (!msg.isMyMessage) {
                  const currentCount = msg.othersUnreadUsers || 0;
                  const newCount = Math.max(0, currentCount - 1);
                  return {
                    ...msg,
                    othersUnreadUsers: newCount,
                  };
                }
                return msg;
              });
            });
          } catch (err) {}
        }, 1000);
      }

      const leftKey = `dm_${counterpartId || newRoomIdStr || "default"}`;
      const leftInfo = getRoomLeftPref(leftKey);

      let hasJoinMessage = false;

      if (leftInfo) {
        clearRoomLeftPref(leftKey);
        setChatHistory([]);
        setHasMoreHistory(false);
        setMessages([]);
      } else {
        try {
          const historyResponse = await getChatHistory(newRoomIdStr || "");
          if (historyResponse.data.content.length > 0) {
            hasJoinMessage = historyResponse.data.content.some((msg) =>
              msg.message.includes("님이 입장했습니다.")
            );

            setChatHistory(historyResponse.data.content);
            setHasMoreHistory(historyResponse.data.hasNext);

            const historyMessages: ChatMessage[] =
              historyResponse.data.content.map((msg: ChatHistoryMessage) => ({
                id: msg.chatId.toString(),
                senderName: msg.senderNickname,
                content: msg.message,
                isMyMessage: msg.mine,
                senderId: msg.senderNickname,
                messageType: msg.messageType,
                images: msg.images?.map((img) => img.imageUrl) || undefined,
                timeLabel: msg.timeLabel,
                othersUnreadUsers: msg.othersUnreadUsers,
                createdAt: msg.createdAt,
              }));
            setMessages(historyMessages);
          } else {
            setChatHistory([]);
            setHasMoreHistory(false);
            setMessages([]);
          }

          if (!hasJoinMessage && currentUserNickname) {
            setTimeout(() => {
              stompSendMessage(
                newRoomIdStr,
                `${currentUserNickname}님이 입장했습니다.`
              );
            }, 300);
          }
        } catch (historyError) {
          setChatHistory([]);
          setMessages([]);
        }
      }

      setError(null);
    } catch (err: any) {
      if (err?.isDuplicateEntry) {
        setError(null);
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : "1:1 채팅방 생성에 실패했습니다.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    counterpartId,
    counterpartName,
    currentUserId,
    currentUserNickname,
    isJoined,
    isLoading,
    roomId,
    connectStomp,
    subscribeToRoom,
    refreshParticipants,
    stompSendMessage,
    existingRoomId,
    getRoomLeftPref,
    clearRoomLeftPref,
  ]);

  // 채팅방 나가기
  const leaveChat = useCallback(async () => {
    if (!roomId) return;

    try {
      await leaveChatRoomNew(roomId);

      const leftKey = `dm_${counterpartId || roomId}`;
      markRoomLeftPref(leftKey, {
        timestamp: Date.now(),
        roomId,
      });

      removeDmChatMapping(counterpartId);
      disconnectStomp();

      setRoomId(null);
      setIsJoined(false);
      setParticipants([]);
      setMessages([]);
      setChatHistory([]);
      setIsMuted(false);
      setError(null);

      joinedCounterpartRef.current = null;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "채팅방 나가기에 실패했습니다.";

      setError(`나가기 실패: ${errorMessage}\n다시 시도해주세요.`);

      alert(
        `채팅방 나가기에 실패했습니다.\n\n${errorMessage}\n\n다시 시도해주세요.`
      );

      disconnectStomp();
      throw err;
    }
  }, [roomId, counterpartId, disconnectStomp, markRoomLeftPref]);

  // 메시지 전송
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !roomId) {
        return;
      }

      if (!stompConnectedState) {
        setError("채팅 연결이 끊어졌습니다. 다시 시도해주세요.");
        return;
      }

      try {
        stompSendMessage(roomId, message);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "메시지 전송에 실패했습니다."
        );
      }
    },
    [roomId, stompConnectedState, stompSendMessage]
  );

  // existingRoomId가 바뀔 때 이전 채팅방 상태 정리 및 새 채팅방 준비
  useEffect(() => {
    if (!existingRoomId) return;

    const isRoomChanged = previousExistingRoomIdRef.current !== existingRoomId;

    // 채팅방이 바뀌었을 때만 상태 초기화
    if (isRoomChanged) {
      setIsJoined(false);
      setRoomId(null);
      setMessages([]);
      setChatHistory([]);
      setParticipants([]);
      setParticipantCount(0);
      setError(null);
      lastLoadedRoomIdRef.current = null; // 히스토리 로드 추적도 초기화
    }
  }, [existingRoomId]);

  // existingRoomId가 바뀌거나 미참여 상태일 때만 채팅방 참여
  // 주의: 메시지 길이 변화에 따라 joinChat을 재호출하면 전송 시 루프/프리징이 발생할 수 있음
  useEffect(() => {
    if (!existingRoomId) return;

    const isRoomChanged = previousExistingRoomIdRef.current !== existingRoomId;

    // 채팅방이 바뀌었거나, 같은 채팅방이지만 아직 참여하지 않은 경우에만 joinChat 수행
    if (isRoomChanged || (!isJoined && !isLoading && !error)) {
      // ref 업데이트는 여기서만 수행 (중복 체크 방지)
      if (isRoomChanged) {
        previousExistingRoomIdRef.current = existingRoomId;
      }

      // 약간의 지연을 두고 참여 (상태 안정화를 위해)
      const timeoutId = setTimeout(() => {
        joinChat();
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // 같은 채팅방이고 이미 참여 중인 경우: 누락된 히스토리/메시지만 보정
    if (!isRoomChanged && isJoined && roomId && existingRoomId === roomId) {
      // 이 roomId에 대해 히스토리를 아직 로드하지 않은 경우
      if (lastLoadedRoomIdRef.current !== existingRoomId) {
        // 히스토리가 없으면 로드
        if (chatHistory.length === 0 && hasMoreHistory && !isLoadingHistory) {
          loadMoreHistory();
        }
        // 히스토리는 있지만 messages에 반영되지 않은 경우 (채팅방 전환 시)
        else if (chatHistory.length > 0 && messages.length === 0) {
          // 히스토리를 messages로 변환
          const historyMessages: ChatMessage[] = chatHistory.map(
            (msg: ChatHistoryMessage) => ({
              id: msg.chatId.toString(),
              senderName: msg.senderNickname,
              content: msg.message,
              isMyMessage: msg.mine,
              senderId: msg.senderNickname,
              messageType: msg.messageType,
              images: msg.images?.map((img) => img.imageUrl) || undefined,
              timeLabel: msg.timeLabel,
              othersUnreadUsers: msg.othersUnreadUsers,
              createdAt: msg.createdAt,
            })
          );
          setMessages(historyMessages);
          lastLoadedRoomIdRef.current = existingRoomId;
        }
      }
    }
  }, [
    existingRoomId,
    isJoined,
    isLoading,
    error,
    joinChat,
    roomId,
    chatHistory,
    messages,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    setMessages,
  ]);

  // roomId가 설정되면 STOMP 구독
  useEffect(() => {
    if (roomId === "1") {
      return;
    }

    if (roomId && stompConnectedState) {
      subscribeToRoom(roomId);
    }
  }, [roomId, stompConnectedState, subscribeToRoom]);

  return {
    // 채팅방 상태
    roomId,
    isJoined,
    isLoading,
    error,

    // 참여자 관련
    participants,
    participantCount,

    // 메시지 관련
    messages,
    chatHistory,
    hasMoreHistory,
    isLoadingHistory,

    // 알림 관련
    isMuted,

    // STOMP 연결 상태
    stompConnected: stompConnectedState,

    // 액션 함수들
    joinChat,
    leaveChat,
    sendMessage,
    refreshParticipants,
    loadMoreHistory,
    toggleMute,
    markAsRead,
  };
};
