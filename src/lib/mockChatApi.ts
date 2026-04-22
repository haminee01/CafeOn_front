import { ChatHistoryMessage, ChatParticipant } from "@/api/chat";
import { MyChatRoomsResponse } from "@/types/chat";

const DEMO_CHAT_KEY = "cafeon-demo-chat-map";
const DEMO_CHAT_ROOMS_KEY = "cafeon-demo-chat-rooms";
const DEMO_CHAT_MUTE_KEY = "cafeon-demo-chat-mute";
const DEMO_CHAT_READ_KEY = "cafeon-demo-chat-read";

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

const nowIso = () => new Date().toISOString();
const emitChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("demo-chat-updated"));
};

const read = (): DemoChatMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DEMO_CHAT_KEY);
  return raw ? (JSON.parse(raw) as DemoChatMap) : {};
};
const write = (data: DemoChatMap) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_KEY, JSON.stringify(data));
};

const seedRooms = (): DemoRoom[] => [
  {
    roomId: 101,
    type: "GROUP",
    cafeId: 1,
    displayName: "스타벅스 강남점",
    memberCount: 24,
  },
  {
    roomId: 102,
    type: "GROUP",
    cafeId: 5,
    displayName: "홍대 카공 모임",
    memberCount: 12,
  },
];

const readRooms = (): DemoRoom[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DEMO_CHAT_ROOMS_KEY);
  if (raw) return JSON.parse(raw) as DemoRoom[];
  const seeded = seedRooms();
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

const readRead = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(DEMO_CHAT_READ_KEY);
  return raw ? (JSON.parse(raw) as Record<string, number>) : {};
};
const writeRead = (value: Record<string, number>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CHAT_READ_KEY, JSON.stringify(value));
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const ensureRoomMessages = (roomId: string): ChatHistoryMessage[] => {
  const map = read();
  if (!map[roomId]) {
    const seed = Array.from({ length: 8 }).map((_, idx) => {
      const createdAt = new Date(Date.now() - (8 - idx) * 7 * 60 * 1000).toISOString();
      const mine = idx % 2 === 1;
      return {
        chatId: Number(roomId) * 1000 + idx + 1,
        roomId: Number(roomId),
        message: mine ? "좋아요, 감사합니다!" : "디저트 추천 부탁해요!",
        senderNickname: mine ? "게스트" : "카페메이트",
        timeLabel: formatTime(createdAt),
        mine,
        messageType: "TEXT",
        createdAt,
        othersUnreadUsers: mine ? 0 : 1,
        images: [],
      } as ChatHistoryMessage;
    });
    map[roomId] = seed;
    write(map);
    return seed;
  }
  return map[roomId];
};

const upsertRoom = (room: DemoRoom) => {
  const rooms = readRooms();
  const idx = rooms.findIndex((r) => r.roomId === room.roomId);
  if (idx >= 0) rooms[idx] = room;
  else rooms.unshift(room);
  writeRooms(rooms);
};

const ensureGroupRoom = (cafeId: string, cafeName?: string): DemoRoom => {
  const rooms = readRooms();
  const existing = rooms.find(
    (r) => r.type === "GROUP" && String(r.cafeId) === String(cafeId)
  );
  if (existing) {
    const nextName = cafeName?.trim() || existing.displayName;
    if (nextName !== existing.displayName) {
      const updated = { ...existing, displayName: nextName };
      upsertRoom(updated);
      return updated;
    }
    return existing;
  }
  const roomId = Number(cafeId) + 100;
  const created: DemoRoom = {
    roomId,
    type: "GROUP",
    cafeId: Number(cafeId),
    displayName: cafeName?.trim() || `카페 ${cafeId}`,
    memberCount: 8,
  };
  upsertRoom(created);
  ensureRoomMessages(String(roomId));
  return created;
};

const ensureDmRoom = (counterpartId: string): DemoRoom => {
  const rooms = readRooms();
  const existing = rooms.find(
    (r) => r.type === "PRIVATE" && r.counterpartId === counterpartId
  );
  if (existing) return existing;

  const maxRoom = rooms.reduce((acc, r) => Math.max(acc, r.roomId), 200);
  const created: DemoRoom = {
    roomId: maxRoom + 1,
    type: "PRIVATE",
    cafeId: null,
    displayName: counterpartId,
    counterpartId,
    memberCount: 2,
  };
  upsertRoom(created);
  ensureRoomMessages(String(created.roomId));
  return created;
};

const markReadInternal = (roomId: string, lastReadChatId: number) => {
  const map = read();
  const list = ensureRoomMessages(roomId);
  map[roomId] = list.map((m) =>
    !m.mine && m.chatId <= lastReadChatId ? { ...m, othersUnreadUsers: 0 } : m
  );
  write(map);

  const readMap = readRead();
  readMap[roomId] = Math.max(readMap[roomId] || 0, lastReadChatId);
  writeRead(readMap);
};

export const demoJoinRoom = (cafeId: string) => {
  const room = ensureGroupRoom(cafeId);
  return {
    message: "ok",
    data: {
      userId: "guest-user",
      memberId: 1,
      cafeId: Number(cafeId),
      roomId: room.roomId,
      roomName: room.displayName,
      type: "GROUP",
      muted: false,
      maxCapacity: 100,
      currentMembers: room.memberCount,
      joinedAt: nowIso(),
      alreadyJoined: true,
    },
  };
};

export const demoJoinGroupRoom = (cafeId: string, cafeName?: string) => {
  const room = ensureGroupRoom(cafeId, cafeName);
  const roomId = String(room.roomId);
  const list = ensureRoomMessages(roomId);
  const joinedExists = list.some(
    (m) => !m.mine && m.messageType === "ENTER" && m.message === "게스트님이 입장했습니다."
  );

  if (!joinedExists) {
    const map = read();
    const maxId = list.reduce((acc, cur) => Math.max(acc, cur.chatId || 0), room.roomId * 1000);
    const createdAt = nowIso();
    map[roomId] = [
      ...list,
      {
        chatId: maxId + 1,
        roomId: room.roomId,
        message: "게스트님이 입장했습니다.",
        senderNickname: "시스템",
        timeLabel: formatTime(createdAt),
        mine: false,
        messageType: "ENTER",
        createdAt,
        othersUnreadUsers: 0,
        images: [],
      },
    ].slice(-300);
    write(map);
  }

  emitChanged();
  return {
    message: "ok",
    data: {
      userId: "guest-user",
      memberId: 1,
      cafeId: Number(cafeId),
      roomId: room.roomId,
      roomName: room.displayName,
      type: "GROUP",
      muted: readMute()[roomId] ?? false,
      maxCapacity: 100,
      currentMembers: room.memberCount,
      joinedAt: nowIso(),
      alreadyJoined: true,
    },
  };
};

export const demoJoinDmRoom = (counterpartId: string) => {
  const room = ensureDmRoom(counterpartId);
  emitChanged();
  return {
    message: "ok",
    data: {
      userId: "guest-user",
      memberId: 1,
      roomId: room.roomId,
      type: "PRIVATE",
      muted: readMute()[String(room.roomId)] ?? false,
      joinedAt: nowIso(),
      alreadyJoined: true,
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
      {
        userId: room.counterpartId || "user-2",
        nickname: room.displayName || room.counterpartId || "카페메이트",
        me: false,
      },
    ];
  }
  return [
    { userId: "guest-user", nickname: "게스트", me: true },
    { userId: "user-2", nickname: "카페메이트", me: false },
    { userId: "user-3", nickname: "원두러버", me: false },
  ];
};

export const demoHistory = (roomId: string, beforeId?: string, size = 50) => {
  const all = [...ensureRoomMessages(roomId)].sort((a, b) => b.chatId - a.chatId);
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
  const list = ensureRoomMessages(roomId);
  const room = readRooms().find((r) => String(r.roomId) === String(roomId));
  const now = nowIso();
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
    othersUnreadUsers: Math.max((room?.memberCount || 2) - 1, 0),
    images: [],
  };
  map[roomId] = [...list, message].slice(-300);
  write(map);
  emitChanged();
  return message;
};

export const demoGetMyChatRooms = (): MyChatRoomsResponse => {
  const rooms = readRooms();
  const map = read();
  const readMap = readRead();
  const content = rooms
    .map((room) => {
      const roomId = String(room.roomId);
      const messages = map[roomId] || [];
      const last = messages[messages.length - 1];
      const lastRead = readMap[roomId] || 0;
      const unreadCount = messages.filter((m) => !m.mine && m.chatId > lastRead).length;
      return {
        roomId: room.roomId,
        displayName: room.displayName,
        type: room.type,
        cafeId: room.cafeId,
        counterpartId:
          room.type === "PRIVATE"
            ? Number((room.counterpartId || "").replace(/\D/g, "") || 0)
            : undefined,
        counterpartUserId: room.counterpartId,
        unreadCount,
        lastMessage: last?.message || "대화를 시작해보세요.",
        lastMessageAt: last?.createdAt || nowIso(),
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
  markReadInternal(roomId, lastReadChatId);
  emitChanged();
};

export const demoReadLatest = (roomId: string) => {
  const list = ensureRoomMessages(roomId);
  const latest = list[list.length - 1]?.chatId || 0;
  markReadInternal(roomId, latest);
  emitChanged();
};

export const demoToggleMute = (roomId: string, muted: boolean) => {
  const mute = readMute();
  mute[roomId] = muted;
  writeMute(mute);
  emitChanged();
};

export const demoLeaveRoom = (roomId: string) => {
  const map = read();
  delete map[String(roomId)];
  write(map);

  const rooms = readRooms().filter((r) => String(r.roomId) !== String(roomId));
  writeRooms(rooms);

  const mute = readMute();
  delete mute[String(roomId)];
  writeMute(mute);

  const readMap = readRead();
  delete readMap[String(roomId)];
  writeRead(readMap);

  emitChanged();
};
