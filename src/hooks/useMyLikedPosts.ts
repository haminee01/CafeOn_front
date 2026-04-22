import { useState, useEffect } from "react";
import {
  MyLikedPost,
  MyLikedPostsResponse,
  MyLikedPostsParams,
} from "@/types/Post";
import apiClient from "@/lib/axios";
import { mockMyLikedPosts } from "@/data/mockUserActivity";

export const useMyLikedPosts = (params: MyLikedPostsParams = {}) => {
  const [likedPosts, setLikedPosts] = useState<MyLikedPost[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyLikedPosts = async (fetchParams: MyLikedPostsParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const page = fetchParams.page ?? 0;
        const size = fetchParams.size ?? 10;
        const start = page * size;
        const content = mockMyLikedPosts.slice(start, start + size) as MyLikedPost[];
        setLikedPosts(content);
        setTotalElements(mockMyLikedPosts.length);
        setTotalPages(Math.max(1, Math.ceil(mockMyLikedPosts.length / size)));
        return;
      }
      const response = await apiClient.get<MyLikedPostsResponse>(
        "/api/my/likes/posts",
        {
          params: {
            page: fetchParams.page,
            size: fetchParams.size,
          },
        }
      );

      const pageData = response.data.data;

      setLikedPosts(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
    } catch (err) {
      const errorMessage =
        (err as any)?.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : "알 수 없는 오류가 발생했습니다.");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLikedPosts(params);
  }, [params.page, params.size]);

  return {
    likedPosts,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: () => fetchMyLikedPosts(params),
    fetchWithParams: fetchMyLikedPosts,
  };
};
