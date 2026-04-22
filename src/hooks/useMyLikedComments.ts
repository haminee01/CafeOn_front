import { useState, useEffect } from "react";
import {
  MyLikedComment,
  MyLikedCommentsResponse,
  MyLikedCommentsParams,
} from "@/types/Post";
import apiClient from "@/lib/axios";
import { mockMyLikedComments } from "@/data/mockUserActivity";

export const useMyLikedComments = (params: MyLikedCommentsParams = {}) => {
  const [likedComments, setLikedComments] = useState<MyLikedComment[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyLikedComments = async (
    fetchParams: MyLikedCommentsParams = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const page = fetchParams.page ?? 0;
        const size = fetchParams.size ?? 10;
        const start = page * size;
        const content = mockMyLikedComments.slice(start, start + size) as unknown as MyLikedComment[];
        setLikedComments(content);
        setTotalElements(mockMyLikedComments.length);
        setTotalPages(Math.max(1, Math.ceil(mockMyLikedComments.length / size)));
        return;
      }
      const response = await apiClient.get<MyLikedCommentsResponse>(
        "/api/my/likes/comments",
        {
          params: {
            page: fetchParams.page,
            size: fetchParams.size,
          },
        }
      );

      const pageData = response.data.data;

      setLikedComments(pageData.content || []);
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
    fetchMyLikedComments(params);
  }, [params.page, params.size]);

  return {
    likedComments,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: () => fetchMyLikedComments(params),
    fetchWithParams: fetchMyLikedComments,
  };
};
