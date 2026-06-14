"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useMyQuestionDetail } from "@/hooks/useMyQuestionDetail";
import { useMyQuestionActions } from "@/hooks/useMyQuestionActions";
import { useAnswerList } from "@/hooks/useQnA";
import { useAuth } from "@/contexts/AuthContext";
import QuestionEditModal from "@/components/qna/QuestionEditModal";
import { useToastContext } from "@/components/common/ToastProvider";
import { formatDateTime } from "@/utils/dateFormat";
import { colors } from "@/constants/colors";

interface QuestionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function QuestionDetailPage({
  params,
}: QuestionDetailPageProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { showToast } = useToastContext();

  const resolvedParams = use(params);
  const questionId = parseInt(resolvedParams.id);
  const { question, isLoading, error, refetch } =
    useMyQuestionDetail(questionId);

  const {
    answers,
    isLoading: answersLoading,
    error: answersError,
  } = useAnswerList(question?.status === "ANSWERED" ? questionId : 0);

  const {
    updateQuestion,
    deleteQuestion,
    isLoading: actionLoading,
    error: actionError,
  } = useMyQuestionActions();

  const handleBackClick = () => {
    router.push("/mypage/qna");
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleEditSave = async (updateData: any) => {
    const success = await updateQuestion(questionId, updateData);
    if (success) {
      showToast("문의가 성공적으로 수정되었습니다.", "success");
      refetch(); // 데이터 새로고침
    }
    return success;
  };

  const handleDeleteConfirm = async () => {
    const success = await deleteQuestion(questionId);
    if (success) {
      showToast("문의가 성공적으로 삭제되었습니다.", "success", 3000); // 3초로 연장
      // 토스트를 충분히 볼 수 있도록 페이지 이동을 지연
      setTimeout(() => {
        router.push("/mypage/qna"); // 목록으로 이동
      }, 2000); // 2초 후 이동
    }
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "답변 대기";
      case "ANSWERED":
        return "답변 완료";
      default:
        return "알 수 없음";
    }
  };

  // 상태 배경색 스타일
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return { backgroundColor: colors.brown, color: "white" };
      case "ANSWERED":
        return { backgroundColor: colors.beige, color: "white" };
      default:
        return { backgroundColor: "#6b7280", color: "white" };
    }
  };

  const getVisibilityText = (visibility: string) => {
    return visibility === "PUBLIC" ? "공개" : "비공개";
  };

  // 가시성 배경색 스타일
  const getVisibilityBgColor = (visibility: string) => {
    if (visibility === "PUBLIC") {
      return { backgroundColor: colors.beige, color: "white" };
    } else {
      return { backgroundColor: "#6b7280", color: "white" };
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="p-8 bg-white min-h-full flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 데이터 로딩 중
  if (isLoading) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">문의 내용을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">오류가 발생했습니다.</div>
          <div className="text-gray-500 mb-4">{error}</div>
          <div className="space-x-4">
            <button
              onClick={refetch}
              className="bg-[#6E4213] text-white text-sm px-4 py-2 rounded-md hover:bg-[#5a360f] transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBackClick}
              className="bg-gray-500 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 문의 데이터가 없는 경우
  if (!question) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">문의를 찾을 수 없습니다.</div>
          <button
            onClick={handleBackClick}
            className="bg-[#6E4213] text-white text-sm px-4 py-2 rounded-md hover:bg-[#5a360f] transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-white min-h-full">
      {/* 헤더 영역 */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={handleBackClick}
          className="text-[#6E4213] hover:text-[#5a360f] mb-3 sm:mb-4 flex items-center text-sm sm:text-base"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          문의 목록으로 돌아가기
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            문의 상세
          </h1>

          {/* 액션 버튼들 (답변 대기 상태일 때만 표시) */}
          {question.status === "PENDING" && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleEditClick}
                disabled={actionLoading}
                className="bg-[#C19B6C] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-[#a6855d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-1 sm:flex-none"
              >
                수정
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={actionLoading}
                className="bg-[#999999] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-1 sm:flex-none"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 액션 에러 표시 */}
      {actionError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {actionError}
        </div>
      )}

      {/* 문의 상세 정보 */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* 문의 헤더 */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex-1 min-w-0">
                {question.title}
              </h2>

              {/* 상태 배지 */}
              <span
                style={getStatusBgColor(question.status)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full font-medium"
              >
                {getStatusText(question.status)}
              </span>

              {/* 가시성 배지 */}
              <span
                style={getVisibilityBgColor(question.visibility)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full font-medium"
              >
                {getVisibilityText(question.visibility)}
              </span>
            </div>

            {/* 메타 정보 */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div>
                <span className="font-medium">작성자:</span>{" "}
                {question.authorNickname}
              </div>
              <div>
                <span className="font-medium">작성일:</span>{" "}
                {formatDateTime(question.createdAt)}
              </div>
              {question.updatedAt !== question.createdAt && (
                <div>
                  <span className="font-medium">수정일:</span>{" "}
                  {formatDateTime(question.updatedAt)}
                </div>
              )}
            </div>
          </div>

          {/* 문의 내용 */}
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3 sm:mb-4">
              문의 내용
            </h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
              <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed">
                {question.content}
              </div>
            </div>
          </div>

          {/* 답변이 있는 경우 */}
          {question.status === "ANSWERED" && (
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-green-50">
              <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3 sm:mb-4">
                관리자 답변
              </h3>
              {answersLoading ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  답변을 불러오는 중...
                </div>
              ) : answersError ? (
                <div className="text-center py-4 text-sm text-red-500">
                  답변을 불러오는데 실패했습니다.
                </div>
              ) : answers.length > 0 ? (
                <div className="space-y-4">
                  {answers.map((answer) => (
                    <div
                      key={answer.answerId}
                      className="bg-white p-3 sm:p-4 rounded-md border border-green-200"
                    >
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3 pb-3 border-b border-green-100">
                        <span>
                          <span className="font-medium">답변자:</span>{" "}
                          {answer.adminNickname || "CafeOn 고객센터"}
                        </span>
                        <span>
                          <span className="font-medium">답변일:</span>{" "}
                          {formatDateTime(answer.createdAt)}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed">
                        {answer.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-3 sm:p-4 rounded-md border border-green-200 text-sm sm:text-base text-gray-500">
                  답변 준비 중입니다. 잠시 후 다시 확인해 주세요.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 수정 모달 */}
      <QuestionEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        initialData={{
          title: question.title,
          content: question.content,
          visibility: question.visibility,
        }}
        isLoading={actionLoading}
        showToast={showToast}
      />

      {/* 삭제 확인 다이얼로그 */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                문의 삭제 확인
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                정말로 이 문의를 삭제하시겠습니까? 삭제된 문의는 복구할 수
                없습니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={actionLoading}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
