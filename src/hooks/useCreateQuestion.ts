import { useState } from "react";
import apiClient from "@/lib/axios";
import { createQuestionMock } from "@/lib/mockQnaApi";

// 가시성 enum
export enum QuestionVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// 문의 등록 요청 타입
export interface CreateQuestionRequest {
  title: string;
  content: string;
  visibility: QuestionVisibility;
}

// 문의 등록 응답 타입
export interface CreateQuestionResponse {
  id: number;
  title: string;
  content: string;
  authorNickname: string;
  createdAt: string;
  visibility: QuestionVisibility;
}

// 백엔드 ApiResponse 구조
interface ApiResponse<T> {
  data: T;
  message: string;
  success?: boolean;
}

export const useCreateQuestion = () => {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQuestion = async (
    questionData: CreateQuestionRequest
  ): Promise<CreateQuestionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        return createQuestionMock(questionData);
      }
      const response = await apiClient.post<
        ApiResponse<CreateQuestionResponse>
      >("/api/qna/questions", questionData);

      return response.data.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
      console.error("문의 등록 실패:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createQuestion,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
