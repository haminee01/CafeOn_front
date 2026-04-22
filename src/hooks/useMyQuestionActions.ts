import { useState } from "react";
import apiClient from "@/lib/axios";
import { deleteQuestionMock, updateQuestionMock } from "@/lib/mockQnaApi";

// 문의 수정 요청 타입
export interface UpdateQuestionRequest {
  title: string;
  content: string;
  visibility: "PUBLIC" | "PRIVATE";
}

// 백엔드 ApiResponse 구조
interface ApiResponse<T> {
  data?: T;
  message: string;
  success?: boolean;
}

export const useMyQuestionActions = () => {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 문의 수정
  const updateQuestion = async (
    questionId: number,
    updateData: UpdateQuestionRequest
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        return updateQuestionMock(questionId, updateData);
      }
      await apiClient.put<ApiResponse<unknown>>(
        `/api/my/questions/${questionId}`,
        updateData
      );
      return true;
    } catch (err) {
      const errorMessage =
        (err as any)?.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : "알 수 없는 오류가 발생했습니다.");
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 문의 삭제
  const deleteQuestion = async (questionId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        return deleteQuestionMock(questionId);
      }
      await apiClient.delete<ApiResponse<unknown>>(
        `/api/my/questions/${questionId}`
      );
      return true;
    } catch (err) {
      const errorMessage =
        (err as any)?.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : "알 수 없는 오류가 발생했습니다.");
      setError(errorMessage);
      console.error("문의 삭제 실패:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateQuestion,
    deleteQuestion,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
