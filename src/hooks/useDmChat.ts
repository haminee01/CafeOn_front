import { useEffect, useState, useCallback } from "react";
import { ChatHistoryMessage } from "@/api/chat";
import { ChatMessage, Participant } from "@/types/chat";
import {
  demoHistory,
  demoJoinDmRoom,
  demoParticipants,
  demoReadLatest,
  demoLeaveRoom,
  demoSendMessage,
  demoToggleMute,
} from "@/lib/mockChatApi";

interface UseDmChatProps {
  counterpartId: string;
  counterpartName: string;
  existingRoomId?: string;
}

interface UseDmChatReturn {
  roomId: string | null;
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  participants: Participant[];
  participantCount: number;
  messages: ChatMessage[];
  chatHistory: ChatHistoryMessage[];
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  isMuted: boolean;
  stompConnected: boolean;
  joinChat: () => Promise<void>;
  leaveChat: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshParticipants: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  toggleMute: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

const mapMessages = (history: ChatHistoryMessage[]): ChatMessage[] =>
  history.map((m) => ({
    id: String(m.chatId),
    senderName: m.senderNickname,
    content: m.message,
    isMyMessage: Boolean(m.mine),
    senderId: m.senderNickname,
    messageType: m.messageType,
    images: m.images?.map((img) => img.imageUrl) || undefined,
    timeLabel: m.timeLabel,
    othersUnreadUsers: m.othersUnreadUsers,
    createdAt: m.createdAt,
  }));

export const useDmChat = ({
  counterpartId,
  counterpartName,
  existingRoomId,
}: UseDmChatProps): UseDmChatReturn => {
  const [roomId, setRoomId] = useState<string | null>(existingRoomId || null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);
  const [hasMoreHistory] = useState(false);
  const [isLoadingHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const refreshParticipants = useCallback(async () => {
    if (!roomId) return;
    const next = demoParticipants(roomId).map((p) => ({
      id: p.userId,
      name: p.nickname,
    }));
    setParticipants(next);
  }, [roomId]);

  const refreshMessages = useCallback(async () => {
    if (!roomId) return;
    const history = demoHistory(roomId, undefined, 200).data.content
      .slice()
      .sort((a, b) => a.chatId - b.chatId);
    setChatHistory(history);
    setMessages(mapMessages(history));
  }, [roomId]);

  const joinChat = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const joined = existingRoomId
        ? { data: { roomId: Number(existingRoomId) } }
        : demoJoinDmRoom(counterpartId || counterpartName || "user-2");
      const nextRoomId = String(joined.data.roomId);
      setRoomId(nextRoomId);
      setIsJoined(true);

      const nextParticipants = demoParticipants(nextRoomId).map((p) => ({
        id: p.userId,
        name: p.nickname,
      }));
      setParticipants(nextParticipants);

      const history = demoHistory(nextRoomId, undefined, 200).data.content
        .slice()
        .sort((a, b) => a.chatId - b.chatId);
      setChatHistory(history);
      setMessages(mapMessages(history));
      demoReadLatest(nextRoomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DM 채팅방 참여에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [existingRoomId, counterpartId, counterpartName, isLoading]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!roomId || !message.trim()) return;
      const created = demoSendMessage(roomId, message.trim());
      setChatHistory((prev) => [...prev, created]);
      setMessages((prev) => [...prev, ...mapMessages([created])]);
    },
    [roomId]
  );

  const leaveChat = useCallback(async () => {
    if (!roomId) return;
    demoLeaveRoom(roomId);
    setRoomId(null);
    setIsJoined(false);
    setParticipants([]);
    setMessages([]);
    setChatHistory([]);
  }, [roomId]);

  const toggleMute = useCallback(async () => {
    if (!roomId) return;
    const next = !isMuted;
    demoToggleMute(roomId, next);
    setIsMuted(next);
  }, [roomId, isMuted]);

  const markAsRead = useCallback(async () => {
    if (!roomId) return;
    demoReadLatest(roomId);
  }, [roomId]);

  useEffect(() => {
    if ((existingRoomId || counterpartId || counterpartName) && !isJoined && !isLoading) {
      joinChat();
    }
  }, [existingRoomId, counterpartId, counterpartName, isJoined, isLoading, joinChat]);

  useEffect(() => {
    const handler = () => {
      refreshMessages();
      refreshParticipants();
    };
    window.addEventListener("demo-chat-updated", handler);
    return () => window.removeEventListener("demo-chat-updated", handler);
  }, [refreshMessages, refreshParticipants]);

  return {
    roomId,
    isJoined,
    isLoading,
    error,
    participants,
    participantCount: participants.length,
    messages,
    chatHistory,
    hasMoreHistory,
    isLoadingHistory,
    isMuted,
    stompConnected: true,
    joinChat,
    leaveChat,
    sendMessage,
    refreshMessages,
    refreshParticipants,
    loadMoreHistory: async () => {},
    toggleMute,
    markAsRead,
  };
};
