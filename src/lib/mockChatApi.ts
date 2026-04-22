import { ChatHistoryMessage, ChatParticipant } from "@/api/chat";
import { MyChatRoomsResponse } from "@/types/chat";

const DEMO_CHAT_KEY = "cafeon-demo-chat-map";
const DEMO_CHAT_ROOMS_KEY = "cafeon-demo-chat-rooms";
const DEMO_CHAT_MUTE_KEY = "cafeon-demo-chat-mute";

type DemoChatMap = Record<string, ChatHistoryMessage[]>;
type DemoRoomType = "GROUP" | "PRIVATE";
interface DemoRoom {
  roomId: number;
  type: DemoRoomType;
  cafeId: number | null;
  displayName: string;
  counterpartId?: string;
  memberCount: number;
}

const read = (): DemoChatMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DEMO_CHAT_KEY);
  return raw ? (JSON.parse(raw) as DemoChatMap) : {};
};
const write = (data: DemoChatMap) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(data));
};

const readRooms = (): DemoRoom[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DEMO_CHAT_ROOMS_KEY);
  if (raw) return JSON.parse(raw) as DemoRoom[];
  const seeded: DemoRoom[] = [
    {
      roomId: 101,
      type: "GROUP",
      cafeId: 1,
      displayName: "스타벅스 강남점 채팅",
      memberCount: 24,
    },
    {
      roomId: 102,
      type: "GROUP",
      cafeId: 5,
      displayName: "홍대 카공 모임",
      memberCount: 12,
    },
    {
      roomId: 201,
      type: "PRIVATE",
      cafeId: null,
      displayName: "카페메이트와 DM",
      counterpartId: "user-2",
      memberCount: 2,
    },
  ];
  localStorage.setItem(DEMO_CHAT_ROOMS_KEY, JSON.stringify(seeded));
  return seeded;
};

const writeRooms = (rooms: DemoRoom[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_ROOMS_KEY, JSON.stringify(rooms));
};

const readMute = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DEMO_CHAT_MUTE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
};
const writeMute = (mute: Record<string, boolean>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_MUTE_KEY, JSON.stringify(mute));
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

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

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

export const demoJoinGroupRoom = (cafeId: string) => {
  const rooms = readRooms();
  const existing = rooms.find(
    (r) => r.type === "GROUP" && String(r.cafeId) === String(cafeId)
  );
  if (existing) return demoJoinRoom(cafeId);
  const roomId = Number(cafeId) + 100;
  const next: DemoRoom = {
    roomId,
    type: "GROUP",
    cafeId: Number(cafeId),
    displayName: `카페 ${cafeId} 채팅방`,
    memberCount: 8,
  };
  writeRooms([next, ...rooms]);
  ensureRoom(String(roomId));
  return demoJoinRoom(cafeId);
};

export const demoJoinDmRoom = (counterpartId: string) => {
  const rooms = readRooms();
  const existing = rooms.find(
    (r) => r.type === "PRIVATE" && r.counterpartId === counterpartId
  );
  if (existing) {
    return {
      message: "ok",
      data: {
        userId: "guest-user",
        memberId: 1,
        roomId: existing.roomId,
        type: "PRIVATE",
        muted: false,
        joinedAt: new Date().toISOString(),
        alreadyJoined: true,
      },
    };
  }
  const maxRoom = rooms.reduce((acc, r) => Math.max(acc, r.roomId), 200);
  const roomId = maxRoom + 1;
  const next: DemoRoom = {
    roomId,
    type: "PRIVATE",
    cafeId: null,
    displayName: `${counterpartId}와 DM`,
    counterpartId,
    memberCount: 2,
  };
  writeRooms([next, ...rooms]);
  ensureRoom(String(roomId));
  return {
    message: "ok",
    data: {
      userId: "guest-user",
      memberId: 1,
      roomId,
      type: "PRIVATE",
      muted: false,
      joinedAt: new Date().toISOString(),
      alreadyJoined: false,
    },
  };
};

export const demoParticipants = (roomId?: string): ChatParticipant[] => {
  const room = roomId
    ? readRooms().find((r) => String(r.roomId) === String(roomId))
    : undefined;
  if (room?.type === "PRIVATE") {
    return [
      { userId: "guest-user", nickname: "게스트", me: true },
      { userId: room.counterpartId || "user-2", nickname: "카페메이트", me: false },
    ];
  }
  return [
    { userId: "guest-user", nickname: "게스트", me: true },
    { userId: "user-2", nickname: "카페메이트", me: false },
    { userId: "user-3", nickname: "원두러버", me: false },
  ];
};

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

export const demoSendMessage = (roomId: string, content: string) => {
  const map = read();
  const list = ensureRoom(roomId);
  const now = new Date().toISOString();
  const maxId = list.reduce((acc, cur) => Math.max(acc, cur.chatId || 0), Number(roomId) * 1000);
  const message: ChatHistoryMessage = {
    chatId: maxId + 1,
    roomId: Number(roomId),
    message: content,
    senderNickname: "게스트",
    timeLabel: formatTime(now),
    mine: true,
    messageType: "TEXT",
    createdAt: now,
    othersUnreadUsers: 0,
    images: [],
  };
  map[roomId] = [...list, message];
  write(map);
  return message;
};

export const demoGetMyChatRooms = (): MyChatRoomsResponse => {
  const rooms = readRooms();
  const map = read();
  const content = rooms
    .map((room) => {
      const messages = map[String(room.roomId)] || [];
      const last = messages[messages.length - 1];
      const unreadCount = messages.filter((m) => !m.mine && (m.othersUnreadUsers || 0) > 0).length;
      return {
        roomId: room.roomId,
        displayName: room.displayName,
        type: room.type,
        cafeId: room.cafeId,
        counterpartId: room.type === "PRIVATE" ? Number((room.counterpartId || "").replace(/\D/g, "") || 0) : undefined,
        counterpartUserId: room.counterpartId,
        unreadCount,
        lastMessage: last?.message || "대화를 시작해보세요.",
        lastMessageAt: last?.createdAt || new Date().toISOString(),
        memberCount: room.memberCount,
      };
    })
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

  return {
    message: "ok",
    data: {
      content,
      pageable: {
        pageNumber: 0,
        pageSize: content.length || 10,
        sort: { empty: true, sorted: false, unsorted: true },
        offset: 0,
        paged: true,
        unpaged: false,
      },
      last: true,
      totalElements: content.length,
      totalPages: 1,
      first: true,
      size: content.length || 10,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: content.length,
      empty: content.length === 0,
    },
  };
};

export const demoMarkAsRead = (roomId: string, lastReadChatId: number) => {
  const map = read();
  const list = ensureRoom(roomId);
  map[roomId] = list.map((m) =>
    !m.mine && m.chatId <= lastReadChatId ? { ...m, othersUnreadUsers: 0 } : m
  );
  write(map);
};

export const demoReadLatest = (roomId: string) => {
  const list = ensureRoom(roomId);
  const latest = list[list.length - 1]?.chatId || 0;
  demoMarkAsRead(roomId, latest);
};

export const demoToggleMute = (roomId: string, muted: boolean) => {
  const mute = readMute();
  mute[roomId] = muted;
  writeMute(mute);
};

export const demoLeaveRoom = (roomId: string) => {
  const rooms = readRooms().filter((r) => String(r.roomId) !== String(roomId));
  writeRooms(rooms);
};
