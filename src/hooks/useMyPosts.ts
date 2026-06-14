import { useState, useEffect } from "react";
import { MyPost, MyPostsResponse, MyPostsParams } from "@/types/Post";
import apiClient from "@/lib/axios";
import { listMyDemoPosts } from "@/lib/mockCommunityApi";

export const useMyPosts = (params: MyPostsParams = {}) => {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPosts = async (fetchParams: MyPostsParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const pageData = listMyDemoPosts({
          page: fetchParams.page ?? 0,
          size: fetchParams.size ?? 10,
        });
        setPosts(pageData.content as MyPost[]);
        setTotalElements(pageData.totalElements);
        setTotalPages(pageData.totalPages);
        return;
      }
      const response = await apiClient.get<MyPostsResponse>("/api/my/posts", {
        params: {
          page: fetchParams.page,
          size: fetchParams.size,
        },
      });

      const pageData = response.data.data;

      setPosts(pageData.content || []);
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
    fetchMyPosts(params);
  }, [params.page, params.size]);

  return {
    posts,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: () => fetchMyPosts(params),
    fetchWithParams: fetchMyPosts,
  };
};
