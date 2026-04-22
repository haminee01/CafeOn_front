import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import { mockMyQuestions } from "@/data/mockUserActivity";

// 문의 상태 enum
export enum QuestionStatus {
  PENDING = "PENDING",
  ANSWERED = "ANSWERED",
}

// 가시성 enum
export enum QuestionVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// 문의 데이터 타입
export interface MyQuestion {
  id: number;
  title: string;
  authorNickname: string;
  createdAt: string;
  visibility: QuestionVisibility;
  status: QuestionStatus;
  content?: string; // 상세 내용은 별도 API로 가져올 수 있음
}

// Spring Boot Page 객체 구조
interface PageResponse {
  content: MyQuestion[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// 백엔드 ApiResponse 구조
interface MyQuestionsResponse {
  data: PageResponse;
  message: string;
  success?: boolean;
}

// API 호출 파라미터 타입
interface MyQuestionsParams {
  page?: number;
  size?: number;
  keyword?: string;
}

export const useMyQuestions = (params: MyQuestionsParams = {}) => {
  const [questions, setQuestions] = useState<MyQuestion[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyQuestions = async (fetchParams: MyQuestionsParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const page = fetchParams.page ?? 0;
        const size = fetchParams.size ?? 10;
        const keyword = (fetchParams.keyword || "").trim().toLowerCase();
        const filtered = keyword
          ? mockMyQuestions.filter((q) => q.title.toLowerCase().includes(keyword))
          : mockMyQuestions;
        const start = page * size;
        const content = filtered.slice(start, start + size) as MyQuestion[];
        setQuestions(content);
        setTotalElements(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / size)));
        return;
      }
      const response = await apiClient.get<MyQuestionsResponse>(
        "/api/my/questions",
        {
          params: {
            page: fetchParams.page,
            size: fetchParams.size,
            keyword: fetchParams.keyword,
          },
        }
      );

      const pageData = response.data.data;

      setQuestions(pageData.content || []);
      setTotalPages(pageData.totalPages || 0);
      setTotalElements(pageData.totalElements || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyQuestions(params);
  }, [params.page, params.size, params.keyword]);

  return {
    questions,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: () => fetchMyQuestions(params),
    fetchWithParams: fetchMyQuestions,
  };
};
