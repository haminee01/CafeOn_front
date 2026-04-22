import { mockCafes } from "@/data/mockCafes";

export const mockMyPosts = Array.from({ length: 15 }).map((_, idx) => ({
  id: idx + 1,
  title: `${mockCafes[idx % mockCafes.length].name} 후기 공유`,
  authorNickname: "게스트",
  type: idx % 2 === 0 ? "GENERAL" : "INFO",
  viewCount: 50 + idx * 3,
  likeCount: 10 + idx,
  commentCount: idx % 5,
  createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
}));

export const mockMyComments = Array.from({ length: 12 }).map((_, idx) => ({
  commentId: idx + 1,
  postId: 100 + idx,
  content: "이 카페 분위기 정말 좋아 보여요. 다음에 방문해볼게요!",
  likeCount: idx % 7,
  createdAt: new Date(Date.now() - idx * 43200000).toISOString(),
}));

export const mockMyLikedPosts = Array.from({ length: 9 }).map((_, idx) => ({
  id: 200 + idx,
  title: `${mockCafes[(idx + 8) % mockCafes.length].name} 추천글`,
  author: "카페온유저",
  views: 120 + idx * 8,
  likes: 30 + idx * 2,
  commentCount: 5 + (idx % 4),
  createdAt: new Date(Date.now() - idx * 65000000).toISOString(),
}));

export const mockMyLikedComments = Array.from({ length: 10 }).map((_, idx) => ({
  commentId: 300 + idx,
  postId: 500 + idx,
  content: "동의합니다! 디저트 라인업이 특히 훌륭했어요.",
  likeCount: 3 + (idx % 6),
  createdAt: new Date(Date.now() - idx * 72000000).toISOString(),
}));

export const mockMyQuestions = Array.from({ length: 11 }).map((_, idx) => ({
  id: 400 + idx,
  title: `${mockCafes[(idx + 3) % mockCafes.length].name} 관련 문의`,
  authorNickname: "게스트",
  createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
  visibility: idx % 2 === 0 ? "PUBLIC" : "PRIVATE",
  status: idx % 3 === 0 ? "ANSWERED" : "PENDING",
}));
