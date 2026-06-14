import { mockCafes } from "@/data/mockCafes";
import { PostListItem, PostDetail, Comment, PostType } from "@/types/Post";

const DEMO_POSTS_KEY = "cafeon-demo-community-posts-v2";
const DEMO_COMMENTS_KEY = "cafeon-demo-community-comments-v2";
const DEMO_AUTHOR = "게스트";
const DEMO_AUTHOR_ID = "guest-user";

type DemoPost = PostDetail;
type CommentMap = Record<number, Comment[]>;

const nowIso = () => new Date().toISOString();

const POST_TEMPLATES = [
  {
    title: "강남역 근처 카공 카페 추천 부탁드려요",
    content:
      "노트북 작업하기 좋은 카페를 찾고 있습니다.\n콘센트 많고 조용한 곳 위주로 추천해 주시면 감사하겠습니다.",
    type: "QUESTION" as PostType,
  },
  {
    title: "성수동 디저트 맛집 정리해봤어요",
    content:
      "이번 주말에 성수동 카페 4곳을 돌아다녔는데, 케이크·마들렌·크로플 맛집 위주로 정리했습니다.\n개인적으로 가장 만족했던 곳은 분위기도 좋고 음료 밸런스가 훌륭했어요.",
    type: "INFO" as PostType,
  },
  {
    title: "홍대 브런치 카페 어디가 좋을까요?",
    content:
      "친구랑 일요일 브런치 약속이 있는데 홍대 입구 쪽 추천 카페 있을까요?\n대기 시간이 너무 길지 않은 곳이면 좋겠습니다.",
    type: "QUESTION" as PostType,
  },
  {
    title: "연남동 감성 카페 후기",
    content:
      "연남동 작은 골목에 있는 카페를 다녀왔어요.\n인테리어가 정말 예쁘고 바리스타가 추천해준 시그니처 라떼가 인상적이었습니다.",
    type: "GENERAL" as PostType,
  },
  {
    title: "반려견 동반 가능한 카페 리스트 공유",
    content:
      "강아지랑 같이 갈 수 있는 카페를 모아봤습니다.\n실내 동반 가능 여부와 주차 정보까지 적어두었으니 참고해 주세요.",
    type: "INFO" as PostType,
  },
  {
    title: "카페 투어 코스 짜는 팁 있나요?",
    content:
      "하루에 3~4곳 정도 돌아보는 카페 투어를 계획 중인데, 동선 짜는 기준이 궁금합니다.\n경험 있으신 분들 조언 부탁드려요.",
    type: "QUESTION" as PostType,
  },
  {
    title: "겨울 시즌 한정 메뉴 맛본 곳",
    content:
      "요즘 여러 카페에서 시즌 메뉴를 내더라고요.\n밤라떼, 피칸 파이 라떼, 딸기 크림 라떼 등 직접 먹어본 메뉴 후기 남깁니다.",
    type: "GENERAL" as PostType,
  },
  {
    title: "망원동 루프탑 뷰 맛집",
    content:
      "저녁에 방문하기 좋은 루프탑 카페를 소개합니다.\n노을 질 때 분위기가 특히 좋아서 사진 찍기에도 추천해요.",
    type: "INFO" as PostType,
  },
  {
    title: "아메리카노 원두 취향 나눠요",
    content:
      "산미 있는 원두 vs 고소한 원두 중 어떤 스타일을 더 선호하시나요?\n요즘은 에티오피아 예가체프 산미 있는 커피에 빠져 있습니다.",
    type: "GENERAL" as PostType,
  },
  {
    title: "카페 알바생이 추천하는 숨은 메뉴",
    content:
      "메뉴판에 없는 시크릿 메뉴가 있는 카페들이 꽤 있더라고요.\n저는 아이스크림 라떼 반반 커스텀을 자주 마십니다.",
    type: "INFO" as PostType,
  },
];

const COMMENT_TEMPLATES = [
  "저도 비슷한 곳 찾고 있었는데 추천 감사합니다!",
  "여기 주말 오후에는 웨이팅이 좀 있으니 평일 방문 추천해요.",
  "분위기 사진 공유해 주실 수 있나요? 궁금합니다.",
  "가격대는 어떤 편인지도 알려주시면 좋겠어요.",
  "저는 2번째 추천 카페가 특히 좋았습니다.",
  "주차 가능 여부도 같이 적어주시면 더 도움이 될 것 같아요.",
];

const paginate = <T>(items: T[], page = 0, size = 10) => {
  const start = Math.max(0, page) * Math.max(1, size);
  const content = items.slice(start, start + size);
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / Math.max(1, size)));
  return { content, totalElements, totalPages, number: page, size };
};

const seedPosts = (): DemoPost[] =>
  Array.from({ length: 20 }).map((_, idx) => {
    const cafe = mockCafes[idx % mockCafes.length];
    const template = POST_TEMPLATES[idx % POST_TEMPLATES.length];
    const isGuest = idx % 2 === 0;

    return {
      id: idx + 1,
      type: template.type,
      title: isGuest ? template.title : `${cafe.name} ${template.title}`,
      content: isGuest
        ? template.content
        : `${cafe.name}에서의 경험을 공유합니다.\n${template.content}`,
      author: isGuest ? DEMO_AUTHOR : "카페러버",
      authorId: isGuest ? DEMO_AUTHOR_ID : `user-${idx}`,
      authorProfileImageUrl: null,
      created_at: new Date(Date.now() - idx * 3600000 * 6).toISOString(),
      updated_at: new Date(Date.now() - idx * 3600000 * 3).toISOString(),
      views: 100 + idx * 5,
      likes: 8 + (idx % 10),
      comments: 2 + (idx % 4),
      Images: [
        `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop`,
      ],
      likedByMe: idx % 3 === 0,
    };
  });

const seedComments = (): CommentMap => {
  const map: CommentMap = {};
  for (let postId = 1; postId <= 20; postId++) {
    map[postId] = Array.from({ length: 3 }).map((_, idx) => ({
      id: postId * 100 + idx + 1,
      author: idx % 2 === 0 ? DEMO_AUTHOR : "카페매니아",
      content: COMMENT_TEMPLATES[(postId + idx) % COMMENT_TEMPLATES.length],
      likes: idx + 1,
      created_at: new Date(Date.now() - idx * 1800000).toISOString(),
      replies: [],
      likedByMe: idx % 3 === 0,
      parent_id: null,
      children: [],
    }));
  }
  return map;
};

const read = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw) as T;
};

const write = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

const getPosts = () => read<DemoPost[]>(DEMO_POSTS_KEY, seedPosts());
const getCommentMap = () => read<CommentMap>(DEMO_COMMENTS_KEY, seedComments());

export const listDemoPosts = (query: {
  page: number;
  keyword?: string;
  type?: PostType;
  sort?: "latest" | "likes" | "views";
}) => {
  let posts = [...getPosts()];
  if (query.keyword) posts = posts.filter((p) => p.title.includes(query.keyword || ""));
  if (query.type) posts = posts.filter((p) => p.type === query.type);
  if (query.sort === "likes") posts.sort((a, b) => b.likes - a.likes);
  else if (query.sort === "views") posts.sort((a, b) => b.views - a.views);
  else posts.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const size = 10;
  const start = Math.max(0, query.page - 1) * size;
  const slice = posts.slice(start, start + size);
  const list: PostListItem[] = slice.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    author: p.author,
    authorProfileImageUrl: p.authorProfileImageUrl,
    created_at: p.created_at,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    likedByMe: p.likedByMe,
  }));

  return { posts: list, pages: Math.max(1, Math.ceil(posts.length / size)) };
};

export const getDemoPostDetail = (postId: number) => {
  const found = getPosts().find((p) => p.id === postId);
  if (!found) throw new Error("게시글을 찾을 수 없습니다.");
  return found;
};

export const getDemoComments = (postId: number) => getCommentMap()[postId] || [];

export const createDemoPost = (payload: {
  title: string;
  content: string;
  type: PostType;
}) => {
  const posts = getPosts();
  const nextId =
    posts.length > 0 ? Math.max(...posts.map((post) => post.id)) + 1 : 1;
  const post: DemoPost = {
    id: nextId,
    title: payload.title,
    content: payload.content,
    type: payload.type,
    author: "게스트",
    authorId: "guest-user",
    authorProfileImageUrl: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    views: 0,
    likes: 0,
    comments: 0,
    Images: [],
    likedByMe: false,
  };
  write(DEMO_POSTS_KEY, [post, ...posts]);
  return { id: nextId, message: "게시글이 작성되었습니다." };
};

export const updateDemoPost = (postId: number, payload: { title: string; content: string; type: PostType }) => {
  const posts = getPosts().map((p) => (p.id === postId ? { ...p, ...payload, updated_at: nowIso() } : p));
  write(DEMO_POSTS_KEY, posts);
  return { message: "게시글이 수정되었습니다." };
};

export const deleteDemoPost = (postId: number) => {
  write(DEMO_POSTS_KEY, getPosts().filter((p) => p.id !== postId));
  const commentMap = getCommentMap();
  delete commentMap[postId];
  write(DEMO_COMMENTS_KEY, commentMap);
  return { message: "게시글이 삭제되었습니다." };
};

export const createDemoComment = (postId: number, arg: { content: string; parentId?: number }) => {
  const comments = getCommentMap();
  const list = comments[postId] || [];
  const id = Date.now();
  const next: Comment = {
    id,
    author: "게스트",
    content: arg.content,
    likes: 0,
    created_at: nowIso(),
    replies: [],
    likedByMe: false,
    parent_id: arg.parentId ?? null,
    children: [],
  };
  comments[postId] = [next, ...list];
  write(DEMO_COMMENTS_KEY, comments);
  // 댓글 수 동기화
  write(
    DEMO_POSTS_KEY,
    getPosts().map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p))
  );
  return { id, message: "댓글이 작성되었습니다." };
};

export const toggleDemoPostLike = (postId: number) => {
  const posts = getPosts();
  const target = posts.find((p) => p.id === postId);
  if (!target) throw new Error("게시글을 찾을 수 없습니다.");

  const nextLiked = !Boolean(target.likedByMe);
  const nextLikes = Math.max((target.likes || 0) + (nextLiked ? 1 : -1), 0);

  write(
    DEMO_POSTS_KEY,
    posts.map((p) =>
      p.id === postId ? { ...p, likedByMe: nextLiked, likes: nextLikes, updated_at: nowIso() } : p
    )
  );

  return {
    message: "좋아요가 반영되었습니다.",
    data: {
      postId,
      liked: nextLiked,
      likes: nextLikes,
    },
  };
};

const updateCommentLikeRecursive = (comments: Comment[], commentId: number): { updated: Comment[]; result?: { liked: boolean; likes: number } } => {
  let foundResult: { liked: boolean; likes: number } | undefined;

  const updated = comments.map((comment) => {
    if (comment.id === commentId) {
      const nextLiked = !Boolean(comment.likedByMe);
      const nextLikes = Math.max((comment.likes || 0) + (nextLiked ? 1 : -1), 0);
      foundResult = { liked: nextLiked, likes: nextLikes };
      return {
        ...comment,
        likedByMe: nextLiked,
        likes: nextLikes,
      };
    }

    if (comment.children && comment.children.length > 0) {
      const childResult = updateCommentLikeRecursive(comment.children, commentId);
      if (childResult.result) foundResult = childResult.result;
      return {
        ...comment,
        children: childResult.updated,
      };
    }

    return comment;
  });

  return { updated, result: foundResult };
};

export const toggleDemoCommentLike = (commentId: number) => {
  const map = getCommentMap();
  let response: { liked: boolean; likes: number } | undefined;

  const nextMap = Object.fromEntries(
    Object.entries(map).map(([postId, comments]) => {
      const updated = updateCommentLikeRecursive(comments, commentId);
      if (updated.result) response = updated.result;
      return [postId, updated.updated];
    })
  ) as CommentMap;

  if (!response) throw new Error("댓글을 찾을 수 없습니다.");

  write(DEMO_COMMENTS_KEY, nextMap);
  return {
    message: "좋아요가 반영되었습니다.",
    data: {
      commentId,
      liked: response.liked,
      likes: response.likes,
    },
  };
};

const updateCommentRecursive = (
  comments: Comment[],
  commentId: number,
  content: string
): { updated: Comment[]; found: boolean } => {
  let found = false;
  const updated = comments.map((comment) => {
    if (comment.id === commentId) {
      found = true;
      return { ...comment, content };
    }
    if (comment.children && comment.children.length > 0) {
      const childResult = updateCommentRecursive(comment.children, commentId, content);
      if (childResult.found) found = true;
      return { ...comment, children: childResult.updated };
    }
    return comment;
  });
  return { updated, found };
};

const deleteCommentRecursive = (
  comments: Comment[],
  commentId: number
): { updated: Comment[]; removed: boolean } => {
  let removed = false;
  const updated = comments
    .filter((comment) => {
      if (comment.id === commentId) {
        removed = true;
        return false;
      }
      return true;
    })
    .map((comment) => {
      if (comment.children && comment.children.length > 0) {
        const childResult = deleteCommentRecursive(comment.children, commentId);
        if (childResult.removed) removed = true;
        return { ...comment, children: childResult.updated };
      }
      return comment;
    });
  return { updated, removed };
};

const countComments = (comments: Comment[]): number =>
  comments.reduce(
    (acc, comment) => acc + 1 + countComments(comment.children || []),
    0
  );

const flattenComments = (
  comments: Comment[],
  postId: number,
  predicate: (comment: Comment) => boolean
) => {
  const result: Array<Comment & { postId: number }> = [];
  const walk = (list: Comment[]) => {
    list.forEach((comment) => {
      if (predicate(comment)) {
        result.push({ ...comment, postId });
      }
      if (comment.children?.length) walk(comment.children);
    });
  };
  walk(comments);
  return result;
};

export const updateDemoComment = (
  postId: number,
  commentId: number,
  content: string
) => {
  const map = getCommentMap();
  const list = map[postId] || [];
  const { updated, found } = updateCommentRecursive(list, commentId, content);
  if (!found) throw new Error("댓글을 찾을 수 없습니다.");
  map[postId] = updated;
  write(DEMO_COMMENTS_KEY, map);
  return { message: "댓글이 수정되었습니다." };
};

export const deleteDemoComment = (postId: number, commentId: number) => {
  const map = getCommentMap();
  const list = map[postId] || [];
  const { updated, removed } = deleteCommentRecursive(list, commentId);
  if (!removed) throw new Error("댓글을 찾을 수 없습니다.");
  map[postId] = updated;
  write(DEMO_COMMENTS_KEY, map);
  write(
    DEMO_POSTS_KEY,
    getPosts().map((post) =>
      post.id === postId
        ? { ...post, comments: countComments(updated), updated_at: nowIso() }
        : post
    )
  );
  return { message: "댓글이 삭제되었습니다." };
};

export const listMyDemoPosts = (params: { page?: number; size?: number }) => {
  const posts = getPosts()
    .filter((post) => post.authorId === DEMO_AUTHOR_ID)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const pageData = paginate(posts, params.page ?? 0, params.size ?? 10);
  return {
    content: pageData.content.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      authorNickname: post.author,
      createdAt: post.created_at,
      viewCount: post.views,
      likeCount: post.likes,
      commentCount: post.comments,
      likedByMe: Boolean(post.likedByMe),
    })),
    totalElements: pageData.totalElements,
    totalPages: pageData.totalPages,
  };
};

export const listMyDemoComments = (params: { page?: number; size?: number }) => {
  const map = getCommentMap();
  const all = Object.entries(map).flatMap(([postId, comments]) =>
    flattenComments(comments, Number(postId), (comment) => comment.author === DEMO_AUTHOR)
  );
  all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const pageData = paginate(all, params.page ?? 0, params.size ?? 10);
  return {
    content: pageData.content.map((comment) => ({
      commentId: comment.id,
      parentId: comment.parent_id,
      postId: comment.postId,
      authorName: comment.author,
      content: comment.content,
      createdAt: comment.created_at,
      children: comment.children || [],
      likeCount: comment.likes,
      likedByMe: Boolean(comment.likedByMe),
    })),
    totalElements: pageData.totalElements,
    totalPages: pageData.totalPages,
  };
};

export const listMyDemoLikedPosts = (params: { page?: number; size?: number }) => {
  const posts = getPosts()
    .filter((post) => Boolean(post.likedByMe))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const pageData = paginate(posts, params.page ?? 0, params.size ?? 10);
  return {
    content: pageData.content.map((post) => ({
      id: post.id,
      title: post.title,
      author: post.author,
      createdAt: post.created_at,
      views: post.views,
      likes: post.likes,
      commentCount: post.comments,
    })),
    totalElements: pageData.totalElements,
    totalPages: pageData.totalPages,
  };
};

export const listMyDemoLikedComments = (params: { page?: number; size?: number }) => {
  const map = getCommentMap();
  const all = Object.entries(map).flatMap(([postId, comments]) =>
    flattenComments(comments, Number(postId), (comment) => Boolean(comment.likedByMe))
  );
  all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const pageData = paginate(all, params.page ?? 0, params.size ?? 10);
  return {
    content: pageData.content.map((comment) => ({
      commentId: comment.id,
      parentId: comment.parent_id,
      postId: comment.postId,
      authorName: comment.author,
      content: comment.content,
      createdAt: comment.created_at,
      children: comment.children || [],
      likeCount: comment.likes,
      likedByMe: Boolean(comment.likedByMe),
    })),
    totalElements: pageData.totalElements,
    totalPages: pageData.totalPages,
  };
};

