import { useEffect, useState, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { ChatHistoryMessage } from "@/api/chat";
import {
  demoHistory,
  demoJoinGroupRoom,
  demoParticipants,
  demoReadLatest,
  demoLeaveRoom,
  demoSendMessage,
  demoToggleMute,
} from "@/lib/mockChatApi";

interface UseCafeChatProps {
  cafeId: string;
  cafeName: string;
  existingRoomId?: string;
}

interface UseCafeChatReturn {
  roomId: string | null;
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  requiresLogin: boolean;
  participants: any[];
  participantCount: number;
  messages: ChatMessage[];
  chatHistory: any[];
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  isMuted: boolean;
  stompConnected: boolean;
  joinChat: () => Promise<void>;
  leaveChat: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  refreshParticipants: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  createDmChat: (_counterpartId: string) => Promise<void>;
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

export const useCafeChat = ({
  cafeId,
  cafeName,
  existingRoomId,
}: UseCafeChatProps): UseCafeChatReturn => {
  const [roomId, setRoomId] = useState<string | null>(existingRoomId || null);
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
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
      me: p.me,
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
        : demoJoinGroupRoom(cafeId, cafeName);
      const nextRoomId = String(joined.data.roomId);
      setRoomId(nextRoomId);
      setIsJoined(true);

      const nextParticipants = demoParticipants(nextRoomId).map((p) => ({
        id: p.userId,
        name: p.nickname,
        me: p.me,
      }));
      setParticipants(nextParticipants);

      const history = demoHistory(nextRoomId, undefined, 200).data.content
        .slice()
        .sort((a, b) => a.chatId - b.chatId);
      setChatHistory(history);
      setMessages(mapMessages(history));
      demoReadLatest(nextRoomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "채팅방 참여에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [cafeId, cafeName, existingRoomId, isLoading]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !content.trim()) return;
      const created = demoSendMessage(roomId, content.trim());
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
    if ((existingRoomId || cafeId) && !isJoined && !isLoading) {
      joinChat();
    }
  }, [existingRoomId, cafeId, isJoined, isLoading, joinChat]);

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
    requiresLogin: false,
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
    refreshParticipants,
    refreshMessages,
    loadMoreHistory: async () => {},
    createDmChat: async () => {},
    toggleMute,
    markAsRead,
  };
};
