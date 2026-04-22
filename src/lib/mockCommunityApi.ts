import { mockCafes } from "@/data/mockCafes";
import { PostListItem, PostDetail, Comment, PostType } from "@/types/Post";

const DEMO_POSTS_KEY = "cafeon-demo-community-posts";
const DEMO_COMMENTS_KEY = "cafeon-demo-community-comments";

type DemoPost = PostDetail;
type CommentMap = Record<number, Comment[]>;

const nowIso = () => new Date().toISOString();

const seedPosts = (): DemoPost[] =>
  Array.from({ length: 20 }).map((_, idx) => ({
    id: idx + 1,
    type: (idx % 3 === 0 ? "QUESTION" : idx % 3 === 1 ? "GENERAL" : "INFO") as PostType,
    title: `${mockCafes[idx % mockCafes.length].name} 관련 커뮤니티 글 ${idx + 1}`,
    content: "목업 데이터 기반 게시글입니다. 데모 모드에서 작성/수정/삭제가 가능합니다.",
    author: idx % 2 === 0 ? "게스트" : "카페러버",
    authorId: idx % 2 === 0 ? "guest-user" : `user-${idx}`,
    authorProfileImageUrl: null,
    created_at: new Date(Date.now() - idx * 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - idx * 3600000 * 3).toISOString(),
    views: 100 + idx * 5,
    likes: 8 + (idx % 10),
    comments: 2 + (idx % 4),
    Images: [
      `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop`,
    ],
    likedByMe: idx % 2 === 0,
  }));

const seedComments = (): CommentMap => {
  const map: CommentMap = {};
  for (let postId = 1; postId <= 20; postId++) {
    map[postId] = Array.from({ length: 3 }).map((_, idx) => ({
      id: postId * 100 + idx + 1,
      author: idx % 2 === 0 ? "게스트" : "카페매니아",
      content: `게시글 ${postId}에 대한 목업 댓글 ${idx + 1}`,
      likes: idx + 1,
      created_at: new Date(Date.now() - idx * 1800000).toISOString(),
      replies: [],
      likedByMe: idx % 2 === 0,
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

