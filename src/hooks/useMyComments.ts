import { useState, useEffect } from "react";
import { MyComment, MyCommentsResponse, MyCommentsParams } from "@/types/Post";
import apiClient from "@/lib/axios";
import { mockMyComments } from "@/data/mockUserActivity";

export const useMyComments = (params: MyCommentsParams = {}) => {
  const [comments, setComments] = useState<MyComment[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyComments = async (fetchParams: MyCommentsParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const page = fetchParams.page ?? 0;
        const size = fetchParams.size ?? 10;
        const start = page * size;
        const content = mockMyComments.slice(start, start + size) as unknown as MyComment[];
        setComments(content);
        setTotalElements(mockMyComments.length);
        setTotalPages(Math.max(1, Math.ceil(mockMyComments.length / size)));
        return;
      }
      const response = await apiClient.get<MyCommentsResponse>(
        "/api/my/comments",
        {
          params: {
            page: fetchParams.page,
            size: fetchParams.size,
          },
        }
      );

      const pageData = response.data.data;

      setComments(pageData.content || []);
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
    fetchMyComments(params);
  }, [params.page, params.size]);

  return {
    comments,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: () => fetchMyComments(params),
    fetchWithParams: fetchMyComments,
  };
};
