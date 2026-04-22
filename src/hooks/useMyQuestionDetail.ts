import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { getQuestionDetailMock } from "@/lib/mockQnaApi";

// 문의 상세 응답 타입
export interface MyQuestionDetailResponse {
  id: number;
  title: string;
  content: string;
  authorNickname: string;
  createdAt: string;
  updatedAt: string;
  status: "PENDING" | "ANSWERED";
  visibility: "PUBLIC" | "PRIVATE";
}

// 백엔드 ApiResponse 구조
interface ApiResponse<T> {
  data: T;
  message: string;
  success?: boolean;
}

export const useMyQuestionDetail = (questionId: number | null) => {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [question, setQuestion] = useState<MyQuestionDetailResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionDetail = async () => {
    if (!questionId) {
      setQuestion(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        setQuestion(getQuestionDetailMock(questionId) as MyQuestionDetailResponse);
        return;
      }
      const response = await apiClient.get<
        ApiResponse<MyQuestionDetailResponse>
      >(`/api/my/questions/${questionId}`);

      setQuestion(response.data.data);
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
    fetchQuestionDetail();
  }, [questionId]);

  const refetch = () => {
    fetchQuestionDetail();
  };

  return {
    question,
    isLoading,
    error,
    refetch,
    clearError: () => setError(null),
  };
};
