import { ChatHistoryMessage, ChatParticipant } from "@/api/chat";

const DEMO_CHAT_KEY = "cafeon-demo-chat-map";

type DemoChatMap = Record<string, ChatHistoryMessage[]>;

const read = (): DemoChatMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DEMO_CHAT_KEY);
  return raw ? (JSON.parse(raw) as DemoChatMap) : {};
};
const write = (data: DemoChatMap) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(data));
};

const ensureRoom = (roomId: string): ChatHistoryMessage[] => {
  const map = read();
  if (!map[roomId]) {
    map[roomId] = Array.from({ length: 20 }).map((_, idx) => ({
      chatId: Number(`${roomId}${idx + 1}`),
      roomId: Number(roomId),
      message: idx % 3 === 0 ? "오늘 카페 자리 넉넉해요." : "디저트 추천 부탁해요!",
      senderNickname: idx % 2 === 0 ? "게스트" : "카페메이트",
      timeLabel: `${(idx % 12) + 1}:00`,
      mine: idx % 2 === 0,
      messageType: "TEXT",
      createdAt: new Date(Date.now() - idx * 600000).toISOString(),
      othersUnreadUsers: 0,
      images: idx % 5 === 0 ? [{ imageId: idx + 1, originalFileName: "cafe.jpg", imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1200&auto=format&fit=crop" }] : [],
    }));
    write(map);
  }
  return map[roomId];
};

export const demoJoinRoom = (cafeId: string) => ({
  message: "ok",
  data: {
    userId: "guest-user",
    memberId: 1,
    cafeId: Number(cafeId),
    roomId: Number(cafeId) + 100,
    roomName: `카페 ${cafeId} 채팅방`,
    type: "GROUP",
    muted: false,
    maxCapacity: 100,
    currentMembers: 17,
    joinedAt: new Date().toISOString(),
    alreadyJoined: true,
  },
});

export const demoParticipants = (): ChatParticipant[] => [
  { userId: "guest-user", nickname: "게스트", me: true },
  { userId: "user-2", nickname: "카페메이트", me: false },
  { userId: "user-3", nickname: "원두러버", me: false },
];

export const demoHistory = (roomId: string, beforeId?: string, size = 50) => {
  const all = ensureRoom(roomId).sort((a, b) => b.chatId - a.chatId);
  const filtered = beforeId ? all.filter((m) => m.chatId < Number(beforeId)) : all;
  const content = filtered.slice(0, size);
  return {
    message: "ok",
    data: {
      content,
      hasNext: filtered.length > size,
      nextCursor: content[content.length - 1]?.chatId?.toString(),
    },
  };
};

