import {
  PostListItem,
  PostListResponse,
  PostDetail as PostDetailType,
  PostCreateResponse,
  PostUpdateRequest,
  PostUpdateResponse,
  PostDeleteResponse,
  PostLikeResponse,
  Comment,
  CommentCreateRequest,
  CommentCreateResponse,
  CommentUpdateResponse,
  CommentDeleteResponse,
  CommentLikeResponse,
  ReportRequest,
  ReportResponse,
} from "@/types/Post";
import apiClient from "@/lib/axios";
import {
  listDemoPosts,
  getDemoPostDetail,
  getDemoComments,
  createDemoPost,
  updateDemoPost,
  deleteDemoPost,
  createDemoComment,
  toggleDemoPostLike,
  toggleDemoCommentLike,
} from "@/lib/mockCommunityApi";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// GET /api/posts/{id}/comments 응답 타입 (댓글 목록)
export type CommentListResponse = Comment[];

interface BackendPostListItem {
  id: number;
  type: string;
  title: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

interface BackendPostListResponse {
  message: string;
  data: {
    content: BackendPostListItem[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  } | null;
}

// 백엔드 PostDetail API 응답 구조
interface BackendPostDetailResponse {
  id: number;
  title: string;
  content: string;
  authorNickname: string;
  authorId?: string;
  authorUserId?: string;
  authorProfileImageUrl: string | null;
  type: string;
  viewCount: number;
  images?: Array<
    | {
        imageId?: number;
        id?: number;
        fileName?: string;
        publicUrl?: string; // S3 공개 URL
        imageUrl?: string;
        url?: string;
      }
    | string
  >;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByMe: boolean;
}

interface BackendPostDetailApiResponse {
  message: string;
  data: BackendPostDetailResponse;
}

// PostDetailResponse는 PostDetail 타입을 사용
export type PostDetailResponse = PostDetailType;

/**
 * GET /api/posts - 커뮤니티 글 목록 조회
 * @param query 검색, 필터링, 정렬을 위한 쿼리 파라미터
 */
export const getPosts = async (
  query: {
    page: number;
    keyword?: string;
    type?: PostListItem["type"];
    sort?: "latest" | "likes" | "views";
  } = { page: 1 }
): Promise<PostListResponse> => {
  if (DEMO_MODE) return listDemoPosts(query);
  const backendPageNumber = Math.max(0, query.page - 1);
  const response = await apiClient.get<BackendPostListResponse>("/api/posts", {
    params: {
      page: backendPageNumber,
      keyword: query.keyword,
      type: query.type,
      sort: query.sort,
    },
  });

  const data = response.data.data;

  if (!data || !data.content) {
    return {
      posts: [],
      pages: data?.totalPages || 1,
    };
  }

  const transformedPosts: PostListItem[] = data.content.map((backendPost) => ({
    id: backendPost.id,
    type: backendPost.type as PostListItem["type"],
    title: backendPost.title,
    author: backendPost.authorNickname,
    authorProfileImageUrl: backendPost.authorProfileImageUrl,
    created_at: backendPost.createdAt,
    views: backendPost.viewCount,
    likes: backendPost.likeCount,
    comments: backendPost.commentCount,
    likedByMe: backendPost.likedByMe,
  }));

  const transformedData: PostListResponse = {
    posts: transformedPosts,
    pages: data.totalPages,
  };

  return transformedData;
};

/**
 * GET /api/posts/{id} - 특정 게시글 상세 조회
 * @param postId 조회할 게시글 ID
 */
export const getPostDetail = async (
  postId: number
): Promise<PostDetailResponse> => {
  if (DEMO_MODE) return getDemoPostDetail(postId);
  const response = await apiClient.get<BackendPostDetailApiResponse>(
    `/api/posts/${postId}`
  );

  const backendData = response.data.data;

  let imageUrls: string[] = [];

  if (backendData.images && Array.isArray(backendData.images)) {
    if (backendData.images.length > 0) {
      const firstItem = backendData.images[0];

      if (typeof firstItem === "string") {
        imageUrls = backendData.images as string[];
      } else if (firstItem && typeof firstItem === "object") {
        imageUrls = backendData.images
          .map((img: any) => {
            const url = img.publicUrl || img.imageUrl || img.url || "";
            return url ? decodeURIComponent(url) : "";
          })
          .filter(Boolean) as string[];
      }
    }
  }

  const transformedData: PostDetailResponse = {
    id: backendData.id,
    type: backendData.type as PostDetailType["type"],
    title: backendData.title,
    author: backendData.authorNickname,
    authorId: backendData.authorId || backendData.authorUserId,
    authorProfileImageUrl: backendData.authorProfileImageUrl,
    created_at: backendData.createdAt,
    updated_at: backendData.updatedAt,
    views: backendData.viewCount,
    likes: backendData.likeCount,
    comments: 0,
    content: backendData.content,
    Images: imageUrls,
    likedByMe: backendData.likedByMe,
  };

  return transformedData;
};

interface BackendComment {
  commentId: number;
  parentId: number | null;
  postId: number;
  authorName?: string;
  authorNickname?: string;
  content: string;
  createdAt: string;
  children: BackendComment[];
  likeCount: number;
  likedByMe: boolean;
}

interface BackendCommentListResponse {
  message: string;
  data: {
    content: BackendComment[];
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
}

/**
 * GET /api/posts/{id}/comments - 특정 게시글 댓글 목록 조회
 * @param postId 댓글을 조회할 게시글 ID
 */
export const getComments = async (
  postId: number
): Promise<CommentListResponse> => {
  if (DEMO_MODE) return getDemoComments(postId);
  try {
    const response = await apiClient.get<BackendCommentListResponse>(
      `/api/posts/${postId}/comments`
    );

    const commentsData = response.data.data?.content || [];

    const transformedComments: Comment[] = commentsData.map(
      (backendComment) => ({
        id: backendComment.commentId,
        author:
          backendComment.authorName || backendComment.authorNickname || "익명",
        content: backendComment.content,
        likes: backendComment.likeCount,
        created_at: backendComment.createdAt,
        replies:
          backendComment.children?.map((child) => ({
            id: child.commentId,
            author: child.authorName || child.authorNickname || "익명",
            content: child.content,
            likes: child.likeCount,
            created_at: child.createdAt,
            replies: [],
            likedByMe: child.likedByMe,
            parent_id: child.parentId,
            children: [],
          })) || [],
        likedByMe: backendComment.likedByMe,
        parent_id: backendComment.parentId,
        children:
          backendComment.children?.map((child) => ({
            id: child.commentId,
            author: child.authorName || child.authorNickname || "익명",
            content: child.content,
            likes: child.likeCount,
            created_at: child.createdAt,
            replies: [],
            likedByMe: child.likedByMe,
            parent_id: child.parentId,
            children: [],
          })) || [],
      })
    );

    return transformedComments;
  } catch (error) {
    console.error("댓글 목록 조회 실패:", error);
    throw error;
  }
};

/**
 * POST /api/posts - 게시글 작성 (이미지 포함: FormData 사용)
 */
export async function createPostMutator(
  url: string,
  {
    arg,
  }: {
    arg: {
      title: string;
      content: string;
      type: PostListItem["type"];
      Image?: File[];
    };
  }
): Promise<PostCreateResponse> {
  if (DEMO_MODE) {
    return createDemoPost({
      title: arg.title,
      content: arg.content,
      type: arg.type,
    });
  }
  const formData = new FormData();

  // 게시글 데이터를 JSON으로 추가 (백엔드 @RequestPart 구조에 맞춤)
  const jsonBlob = new Blob(
    [
      JSON.stringify({
        title: arg.title,
        content: arg.content,
        type: arg.type,
      }),
    ],
    { type: "application/json" }
  );
  formData.append("post", jsonBlob);

  // 이미지 파일들 추가 (백엔드에서는 "images"로 받음)
  if (arg.Image && arg.Image.length > 0) {
    arg.Image.forEach((file) => {
      formData.append("images", file);
    });
  }

  const response = await apiClient.post("/api/posts", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const result = response.data;

  // 백엔드 응답을 프론트엔드 형식으로 변환
  if (result.data) {
    const postData = result.data;
    return {
      id: postData.id,
      message: result.message || "게시글이 작성되었습니다.",
    };
  }

  return result;
}

/**
 * PUT /api/posts/{id} - 게시글 수정 (이미지 포함: FormData 사용)
 */
export async function updatePostMutator(
  url: string,
  {
    arg,
  }: {
    arg: PostUpdateRequest;
  }
): Promise<PostUpdateResponse> {
  if (DEMO_MODE) {
    const postId = Number(url.split("/").pop());
    return updateDemoPost(postId, {
      title: arg.title,
      content: arg.content,
      type: arg.type,
    });
  }
  // URL에서 postId 추출
  const postId = url.split("/").pop();

  // 백엔드는 항상 multipart/form-data를 기대하므로 항상 FormData 사용
  const formData = new FormData();

  // 게시글 데이터를 JSON으로 추가 (백엔드 @RequestPart 구조에 맞춤)
  const jsonBlob = new Blob(
    [
      JSON.stringify({
        title: arg.title,
        content: arg.content,
        type: arg.type,
      }),
    ],
    { type: "application/json" }
  );
  formData.append("post", jsonBlob);

  // 이미지 파일들 추가
  const images = (arg as any).Image || arg.image;
  if (images && images.length > 0) {
    images.forEach((file: File, idx: number) => {
      formData.append("images", file);
    });
  }

  const response = await apiClient.put(`/api/posts/${postId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

/**
 * DELETE /api/posts/{id} - 게시글 삭제
 */
export async function deletePostMutator(
  postId: number
): Promise<PostDeleteResponse> {
  if (DEMO_MODE) return deleteDemoPost(postId);
  try {
    const response = await apiClient.delete(`/api/posts/${postId}`);
    return response.data || { message: "게시글이 삭제되었습니다." };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "게시글 삭제 실패";
    throw new Error(errorMessage);
  }
}

/**
 * POST /api/posts/{id}/comments - 댓글/대댓글 작성
 * @param postId 게시글 ID
 * @param arg 댓글 내용 및 부모 댓글 ID (대댓글일 경우)
 */
export async function createCommentMutator(
  postId: number,
  arg: CommentCreateRequest
): Promise<CommentCreateResponse> {
  if (DEMO_MODE) return createDemoComment(postId, arg);
  try {
    const response = await apiClient.post(`/api/posts/${postId}/comments`, arg);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "댓글 작성 실패";
    throw new Error(errorMessage);
  }
}

/**
 * PUT /api/posts/{post_id}/comments/{comment_id} - 댓글 수정
 */
export const updateCommentMutator = async (
  postId: number,
  commentId: number,
  arg: { content: string }
): Promise<CommentUpdateResponse> => {
  if (DEMO_MODE) return { message: "댓글이 수정되었습니다." };
  try {
    const response = await apiClient.put(
      `/api/posts/${postId}/comments/${commentId}`,
      arg
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "댓글 수정 실패";
    throw new Error(errorMessage);
  }
};

/**
 * DELETE /api/posts/{post_id}/comments/{comment_id} - 댓글 삭제
 */
export const deleteCommentMutator = async (
  postId: number,
  commentId: number
): Promise<CommentDeleteResponse> => {
  if (DEMO_MODE) return { message: "댓글이 삭제되었습니다." };
  try {
    const response = await apiClient.delete(
      `/api/posts/${postId}/comments/${commentId}`
    );
    if (response.status === 204 || response.status === 200) {
      return { message: "댓글이 삭제되었습니다." };
    }
    return response.data || { message: "댓글이 삭제되었습니다." };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "댓글 삭제 실패";
    throw new Error(errorMessage);
  }
};

/**
 * POST /api/comments/{id}/like - 댓글 좋아요/취소 토글
 * @param commentId 좋아요를 누를 댓글 ID
 */
export const toggleCommentLike = async (
  commentId: number
): Promise<CommentLikeResponse> => {
  if (DEMO_MODE) return toggleDemoCommentLike(commentId);
  try {
    const response = await apiClient.post(`/api/comments/${commentId}/like`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "좋아요 처리 실패";
    throw new Error(errorMessage);
  }
};

/**
 * POST /api/posts/{id}/like - 게시글 좋아요/취소 토글
 * @param postId 좋아요를 누를 게시글 ID
 */
export const togglePostLike = async (
  postId: number
): Promise<PostLikeResponse> => {
  if (DEMO_MODE) return toggleDemoPostLike(postId);
  try {
    const response = await apiClient.post(`/api/posts/${postId}/like`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "좋아요 처리 실패";
    throw new Error(errorMessage);
  }
};

/**
 * POST /api/posts/{postId}/reports - 게시글 신고하기
 * @param postId 신고할 게시글 ID
 * @param content 신고 사유
 */
export const createPostReport = async (
  postId: number,
  content: string
): Promise<{ message: string }> => {
  if (DEMO_MODE) return { message: "신고가 접수되었습니다." };
  try {
    const response = await apiClient.post(`/api/posts/${postId}/reports`, {
      content,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "신고 처리 실패";
    throw new Error(errorMessage);
  }
};

/**
 * POST /api/reports - 신고하기 (기존 함수 유지)
 * @param reportData 신고 데이터
 */
export const createReport = async (
  reportData: ReportRequest
): Promise<ReportResponse> => {
  if (DEMO_MODE) return { message: "신고가 접수되었습니다." };
  try {
    const response = await apiClient.post("/api/reports", reportData);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "신고 처리 실패";
    throw new Error(errorMessage);
  }
};

// 댓글 신고 API
export const createCommentReport = async (
  commentId: number,
  content: string
): Promise<{ message: string }> => {
  if (DEMO_MODE) return { message: "신고가 접수되었습니다." };
  try {
    const response = await apiClient.post(
      `/api/comments/${commentId}/reports`,
      {
        content,
      }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "신고 처리 실패";
    throw new Error(errorMessage);
  }
};
