import { mockCafes } from "@/data/mockCafes";

type WishlistCategory = "HIDEOUT" | "WORK" | "ATMOSPHERE" | "TASTE" | "PLANNED";

interface DemoUserProfile {
  userId: string;
  email: string;
  nickname: string;
  name: string;
  profileImageUrl: string | null;
  isGuest?: boolean;
}

const STORAGE_KEYS = {
  profile: "cafeon-demo-profile",
  wishlist: "cafeon-demo-wishlist",
  reviews: "cafeon-demo-reviews",
  chatMessages: "cafeon-demo-chat-messages",
};

const DEFAULT_PROFILE: DemoUserProfile = {
  userId: "guest-user",
  email: "guest@cafeon.local",
  nickname: "게스트",
  name: "게스트 사용자",
  profileImageUrl: null,
  isGuest: true,
};

const REVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?q=80&w=1200&auto=format&fit=crop",
];
const CAFE_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=1200&auto=format&fit=crop",
];

const safeWindow = () => (typeof window !== "undefined" ? window : null);

const paginate = <T>(items: T[], page = 0, size = 10) => {
  const start = Math.max(0, page) * Math.max(1, size);
  const content = items.slice(start, start + size);
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, size)));

  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
  };
};

const readStorage = <T>(key: string, fallback: T): T => {
  const w = safeWindow();
  if (!w) return fallback;
  try {
    const raw = w.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = <T>(key: string, value: T) => {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(key, JSON.stringify(value));
};

const ensureDemoProfile = () => {
  const current = readStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE);
  writeStorage(STORAGE_KEYS.profile, current);
  return current;
};

const ensureDemoWishlist = () => {
  const fallback = (["HIDEOUT", "WORK", "ATMOSPHERE", "TASTE", "PLANNED"] as const)
    .flatMap((category, idx) =>
      mockCafes.slice(idx * 4, idx * 4 + 4).map((cafe, offset) => ({
        id: idx * 100 + offset + 1,
        cafeId: Number(cafe.cafe_id),
        name: cafe.name,
        category,
      }))
    );

  const current = readStorage(STORAGE_KEYS.wishlist, fallback);
  writeStorage(STORAGE_KEYS.wishlist, current);
  return current as Array<{
    id: number;
    cafeId: number;
    name: string;
    category: WishlistCategory;
  }>;
};

const ensureDemoReviews = () => {
  const fallback = mockCafes.slice(0, 12).map((cafe, idx) => ({
    reviewId: idx + 1,
    rating: 3.5 + (idx % 3) * 0.5,
    content: `${cafe.name} 방문 후기입니다. 공간 분위기와 커피 퀄리티가 좋아 재방문 의사가 있어요.`,
    createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
    reported: false,
    cafeId: Number(cafe.cafe_id),
    cafeName: cafe.name,
    reviewerId: "guest-user",
    reviewerNickname: "게스트",
    reviewerProfileImageUrl: null,
    images: idx % 2 === 0 ? [{ imageId: idx + 1, originalFileName: "demo.jpg", imageUrl: REVIEW_IMAGES[idx % REVIEW_IMAGES.length] }] : [],
  }));

  const current = readStorage(STORAGE_KEYS.reviews, fallback);
  writeStorage(STORAGE_KEYS.reviews, current);
  return current;
};

const ensureDemoChatMessages = () => {
  const fallback: Record<string, any[]> = {
    "101": Array.from({ length: 18 }).map((_, idx) => ({
      chatId: 101000 + idx + 1,
      roomId: 101,
      senderId: idx % 2 === 0 ? "guest-user" : "user-2",
      senderNickname: idx % 2 === 0 ? "게스트" : "카페메이트",
      content: idx % 3 === 0 ? "오늘 여기 자리 많아요." : "디저트 추천 부탁드려요!",
      message: idx % 3 === 0 ? "오늘 여기 자리 많아요." : "디저트 추천 부탁드려요!",
      mine: idx % 2 === 0,
      messageType: "TEXT",
      createdAt: new Date(Date.now() - (18 - idx) * 600000).toISOString(),
      timeLabel: new Date(Date.now() - (18 - idx) * 600000).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      othersUnreadUsers: idx % 5 === 0 ? 1 : 0,
      images: [],
    })),
    "102": Array.from({ length: 8 }).map((_, idx) => ({
      chatId: 102000 + idx + 1,
      roomId: 102,
      senderId: idx % 2 === 0 ? "user-3" : "guest-user",
      senderNickname: idx % 2 === 0 ? "원두러버" : "게스트",
      content: "홍대 근처 카공하기 좋은 자리 찾는 중이에요.",
      message: "홍대 근처 카공하기 좋은 자리 찾는 중이에요.",
      mine: idx % 2 === 1,
      messageType: "TEXT",
      createdAt: new Date(Date.now() - (8 - idx) * 720000).toISOString(),
      timeLabel: new Date(Date.now() - (8 - idx) * 720000).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      othersUnreadUsers: 0,
      images: [],
    })),
  };
  const current = readStorage(STORAGE_KEYS.chatMessages, fallback);
  writeStorage(STORAGE_KEYS.chatMessages, current);
  return current as Record<string, any[]>;
};

export const getCafeById = (cafeId: string) => {
  const found = mockCafes.find((cafe) => cafe.cafe_id === String(cafeId));
  const enrichCafe = (cafe: any) => {
    const base = CAFE_IMAGE_POOL[Number(cafe.cafe_id) % CAFE_IMAGE_POOL.length];
    const images = [base, CAFE_IMAGE_POOL[(Number(cafe.cafe_id) + 1) % CAFE_IMAGE_POOL.length]];
    const reviewPool = ensureDemoReviews().filter(
      (item: any) => String(item.cafeId) === String(cafe.cafe_id)
    );

    return {
      ...cafe,
      photoUrl: base,
      imageUrl: base,
      images,
      // 카페 상세 API 형식에 맞춰 리뷰를 포함해 상세 페이지에서 바로 노출되게 함
      reviews: reviewPool,
      reviewCount: reviewPool.length,
      reviewsSummary:
        reviewPool.length > 0
          ? `${reviewPool.length}개의 리뷰가 등록되어 있습니다.`
          : "아직 등록된 리뷰가 없습니다.",
    };
  };
  return (
    enrichCafe(
      found || {
        ...mockCafes[0],
        cafe_id: cafeId,
        name: "알 수 없는 카페",
      }
    )
  );
};

export const searchCafesMock = (query?: string, tags?: string | string[]) => {
  const q = (query || "").trim().toLowerCase();
  const tagList = Array.isArray(tags) ? tags : tags ? [tags] : [];
  let result = mockCafes;

  if (q) {
    result = result.filter(
      (cafe) =>
        cafe.name.toLowerCase().includes(q) ||
        cafe.address.toLowerCase().includes(q) ||
        cafe.description.toLowerCase().includes(q)
    );
  }

  if (tagList.length > 0) {
    result = result.filter((cafe) =>
      tagList.some((tag) => cafe.description.includes(tag) || cafe.name.includes(tag))
    );
  }

  return result.map((cafe) => getCafeById(cafe.cafe_id));
};

export const getNearbyCafesMock = (latitude: number, longitude: number, radius = 3000) => {
  const meterToDegree = radius / 111000;
  return mockCafes.filter(
    (cafe) =>
      Math.abs(cafe.latitude - latitude) <= meterToDegree &&
      Math.abs(cafe.longitude - longitude) <= meterToDegree
  ).map((cafe) => getCafeById(cafe.cafe_id));
};

export const getRandomCafesMock = (size = 10) =>
  [...mockCafes].sort(() => Math.random() - 0.5).slice(0, size).map((cafe) => getCafeById(cafe.cafe_id));
export const getHotCafesMock = (size = 10) =>
  [...mockCafes].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, size).map((cafe) => getCafeById(cafe.cafe_id));
export const getWishlistTopCafesMock = (size = 10) => mockCafes.slice(5, 5 + size).map((cafe) => getCafeById(cafe.cafe_id));
export const getRelatedCafesMock = (cafeId: string, size = 10) =>
  mockCafes.filter((cafe) => cafe.cafe_id !== cafeId).slice(0, size).map((cafe) => getCafeById(cafe.cafe_id));

export const getProfileMock = () => ensureDemoProfile();
export const updateProfileMock = (nickname: string) => {
  const profile = { ...ensureDemoProfile(), nickname };
  writeStorage(STORAGE_KEYS.profile, profile);
  return profile;
};

export const getWishlistMock = (params?: { page?: number; size?: number; category?: string }) => {
  const category = (params?.category || "HIDEOUT").toUpperCase();
  const all = ensureDemoWishlist().filter((item) => item.category === category);
  return paginate(all, params?.page ?? 0, params?.size ?? 20);
};

export const deleteWishlistMock = (cafeId: number, category: string) => {
  const next = ensureDemoWishlist().filter(
    (item) => !(item.cafeId === cafeId && item.category === category)
  );
  writeStorage(STORAGE_KEYS.wishlist, next);
  return { message: "북마크가 해제되었습니다." };
};

export const getWishlistCategoriesMock = (cafeId: string) => {
  const categories = ensureDemoWishlist()
    .filter((item) => item.cafeId === Number(cafeId))
    .map((item) => item.category);
  return { data: categories };
};

export const toggleWishlistMock = (cafeId: string, category: string) => {
  const list = ensureDemoWishlist();
  const targetCategory = category.toUpperCase() as WishlistCategory;
  const exists = list.find(
    (item) => item.cafeId === Number(cafeId) && item.category === targetCategory
  );
  if (exists) {
    writeStorage(
      STORAGE_KEYS.wishlist,
      list.filter((item) => item.id !== exists.id)
    );
    return { message: "북마크가 해제되었습니다." };
  }

  const cafe = getCafeById(cafeId);
  const nextItem = {
    id: Date.now(),
    cafeId: Number(cafeId),
    name: cafe.name,
    category: targetCategory,
  };
  writeStorage(STORAGE_KEYS.wishlist, [...list, nextItem]);
  return { message: "북마크에 추가되었습니다." };
};

export const getMyReviewsMock = (params?: { page?: number; size?: number }) => {
  const pageData = paginate(ensureDemoReviews(), params?.page ?? 0, params?.size ?? 10);
  return {
    message: "ok",
    data: {
      ...pageData,
      pageable: {
        pageNumber: pageData.number,
        pageSize: pageData.size,
        sort: { empty: true, unsorted: true, sorted: false },
        offset: pageData.number * pageData.size,
        unpaged: false,
        paged: true,
      },
      last: pageData.number + 1 >= pageData.totalPages,
      sort: { empty: true, unsorted: true, sorted: false },
      first: pageData.number === 0,
      numberOfElements: pageData.content.length,
      empty: pageData.content.length === 0,
    },
  };
};

export const deleteReviewMock = (reviewId: string) => {
  const next = ensureDemoReviews().filter((item: any) => item.reviewId !== Number(reviewId));
  writeStorage(STORAGE_KEYS.reviews, next);
  return { message: "리뷰가 삭제되었습니다." };
};

export const getCafeReviewsMock = (cafeId: string) => {
  const reviews = ensureDemoReviews().filter((item: any) => String(item.cafeId) === String(cafeId));
  return { reviews, count: reviews.length };
};

export const getMyChatRoomsMock = () => ({
  message: "ok",
  data: {
    content: [
      { roomId: 101, cafeId: 1, displayName: "스타벅스 강남점 채팅", type: "GROUP", memberCount: 24, unreadCount: 0, lastMessage: "오늘 자리 넉넉해요!" },
      { roomId: 102, cafeId: 5, displayName: "홍대 카공 모임", type: "GROUP", memberCount: 12, unreadCount: 2, lastMessage: "와이파이 빠른 곳 추천해주세요." },
    ],
  },
});

export const getChatMessagesWithUnreadCountMock = (roomId: string) => {
  const map = ensureDemoChatMessages();
  const content = map[roomId] || [];
  return { data: { content } };
};

export const markChatAsReadMock = (roomId: string, lastReadChatId: string) => {
  const map = ensureDemoChatMessages();
  const readId = Number(lastReadChatId || 0);
  map[roomId] = (map[roomId] || []).map((msg) =>
    msg.chatId <= readId ? { ...msg, othersUnreadUsers: 0 } : msg
  );
  writeStorage(STORAGE_KEYS.chatMessages, map);
  return { message: "읽음 처리 완료" };
};

export const getNotificationsUnreadMock = () => {
  const map = ensureDemoChatMessages();
  const unread = Object.entries(map).flatMap(([roomId, messages]) =>
    messages
      .filter((m) => (m.othersUnreadUsers || 0) > 0)
      .map((m) => ({
        notificationId: `demo-${roomId}-${m.chatId}`,
        roomId,
        chatId: m.chatId,
        title: "새 채팅 메시지",
        preview: m.content,
        deeplink: `/mypage/chats?room=${roomId}`,
        read: false,
        createdAt: m.createdAt,
      }))
  );
  return unread;
};
