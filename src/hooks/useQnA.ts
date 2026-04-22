import { useState, useEffect } from "react";
import {
  QuestionListItem,
  QuestionDetail,
  CreateQuestionRequest,
  CreateQuestionResponse,
  QuestionListParams,
  QuestionListResponse,
  QuestionVisibility,
  ApiResponse,
  Answer,
} from "@/types/qna";
import apiClient from "@/lib/axios";
import {
  getQuestionListMock,
  getQuestionDetailMock,
  createQuestionMock,
  getAnswerListMock,
} from "@/lib/mockQnaApi";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// 문의 목록 조회 훅
export const useQuestionList = (params: QuestionListParams) => {
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        const data = getQuestionListMock({
          page: params.page,
          size: params.size,
          keyword: params.keyword,
        });
        const maskedQuestions = data.content.map((question) => ({
          ...question,
          title:
            question.visibility === QuestionVisibility.PRIVATE
              ? "비공개 문의"
              : question.title,
          authorNickname:
            question.visibility === QuestionVisibility.PRIVATE
              ? "***"
              : question.authorNickname,
        }));
        setQuestions(maskedQuestions);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        return;
      }
      const response = await apiClient.get<ApiResponse<QuestionListResponse>>(
        "/api/qna/questions",
        {
          params: {
            page: params.page,
            size: params.size,
            ...(params.keyword ? { keyword: params.keyword } : {}),
          },
        }
      );
      const data = response.data.data;

      // 비공개 글 제목 및 작성자 마스킹 처리
      const maskedQuestions = data.content.map((question) => ({
        ...question,
        title:
          question.visibility === QuestionVisibility.PRIVATE
            ? "비공개 문의"
            : question.title,
        authorNickname:
          question.visibility === QuestionVisibility.PRIVATE
            ? "***"
            : question.authorNickname,
      }));

      setQuestions(maskedQuestions);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "문의 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [params.page, params.size, params.keyword]);

  return {
    questions,
    totalPages,
    totalElements,
    isLoading,
    error,
    refetch: fetchQuestions,
  };
};

// 문의 상세 조회 훅
export const useQuestionDetail = (id: number) => {
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        setQuestion(getQuestionDetailMock(id));
        return;
      }
      const response = await apiClient.get<ApiResponse<QuestionDetail>>(
        `/api/qna/questions/${id}`
      );
      setQuestion(response.data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "문의를 불러오는데 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  return {
    question,
    isLoading,
    error,
    refetch: fetchQuestion,
  };
};

// 문의 등록 훅
export const useCreateQuestion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createQuestion = async (
    data: CreateQuestionRequest
  ): Promise<CreateQuestionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        return createQuestionMock(data);
      }
      const response = await apiClient.post<
        ApiResponse<CreateQuestionResponse>
      >("/api/qna/questions", data);
      return response.data.data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "문의 등록에 실패했습니다."
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createQuestion,
    isLoading,
    error,
  };
};

// 답변 목록 조회 훅
export const useAnswerList = (questionId: number) => {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnswers = async () => {
    if (!questionId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        setAnswers(getAnswerListMock(questionId));
        return;
      }
      const response = await apiClient.get<ApiResponse<Answer[]>>(
        `/api/qna/questions/${questionId}/answers`
      );
      setAnswers(response.data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "답변을 불러오는데 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnswers();
  }, [questionId]);

  return {
    answers,
    isLoading,
    error,
    refetch: fetchAnswers,
  };
};
