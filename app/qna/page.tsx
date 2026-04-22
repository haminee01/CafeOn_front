"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/common/Pagination";
import { useQuestionList } from "@/hooks/useQnA";
import { QuestionVisibility } from "@/types/qna";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { formatSimpleDate } from "@/utils/dateFormat";
import { colors } from "@/constants/colors";

// 페이지네이션 상수
const ITEMS_PER_PAGE = 10;

// 문의 목록 컴포넌트
interface QuestionListProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  keyword: string;
}

const QuestionList = ({
  currentPage,
  onPageChange,
  keyword,
}: QuestionListProps) => {
  const router = useRouter();

  // 각 문의의 상태를 저장하는 상태
  const [questionStatuses, setQuestionStatuses] = useState<
    Record<number, string | null>
  >({});

  // API 호출
  const { questions, totalPages, isLoading, error, refetch } = useQuestionList({
    page: currentPage - 1, // API는 0부터 시작
    size: ITEMS_PER_PAGE,
    keyword: keyword || undefined,
  });

  useEffect(() => {
    if (questions && questions.length > 0) {
      // 목록 응답의 status를 그대로 사용 (데모/실서버 공통)
      const nextStatuses: Record<number, string | null> = {};
      questions.forEach((question) => {
        nextStatuses[question.id] = (question as any).status ?? null;
      });
      setQuestionStatuses(nextStatuses);
    }
  }, [questions]);

  // 문의 상세 페이지로 이동
  const handleQuestionClick = (questionId: number) => {
    router.push(`/qna/${questionId}`);
  };

  // 가시성 텍스트 변환
  const getVisibilityText = (visibility: QuestionVisibility) => {
    return visibility === QuestionVisibility.PUBLIC ? "공개" : "비공개";
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string | null) => {
    return status === "ANSWERED" ? "답변 완료" : "답변 대기";
  };

  // 상태 색상 변환
  const getStatusColor = (status: string | null) => {
    if (status === "ANSWERED") {
      return `text-white`; // beige 배경에 흰색 텍스트
    } else {
      return `text-white`; // brown 배경에 흰색 텍스트
    }
  };

  // 상태 배경색 스타일
  const getStatusBgColor = (status: string | null) => {
    if (status === "ANSWERED") {
      return { backgroundColor: "rgba(110, 66, 19, 1)", color: "white" };
    } else {
      return { backgroundColor: "rgba(110, 66, 19, 0.5)", color: "white" };
    }
  };

  // 가시성 배경색 스타일
  const getVisibilityBgColor = (visibility: QuestionVisibility) => {
    if (visibility === QuestionVisibility.PUBLIC) {
      return { backgroundColor: colors.beige, color: "white" };
    } else {
      return { backgroundColor: "#6b7280", color: "white" }; // gray-500
    }
  };

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-500">
        문의 목록을 불러오는 중...
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-red-600 mb-2">오류가 발생했습니다.</div>
        <div className="text-gray-500 mb-4">{error}</div>
        <button
          onClick={refetch}
          className="bg-[#6E4213] text-white text-sm px-4 py-2 rounded-md hover:bg-[#5a360f] transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 문의 목록 표시 */}
      <div className="p-0">
        <ul className="space-y-0 divide-y divide-[#999999] border-t border-[#999999]">
          {questions.length > 0 ? (
            questions.map((item) => (
              <li key={item.id} className="text-sm sm:text-base text-gray-800">
                {/* 문의 항목 클릭 영역 */}
                <button
                  onClick={() => handleQuestionClick(item.id)}
                  className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 px-0 text-left hover:bg-gray-50 transition-colors gap-2 sm:gap-0"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {/* 문의 제목 */}
                    <span className="font-semibold text-left flex-1 truncate">
                      {item.title}
                    </span>

                    {/* 상태 배지 */}
                    {questionStatuses[item.id] && (
                      <span
                        style={getStatusBgColor(questionStatuses[item.id])}
                        className="px-2 py-1 text-xs rounded-full flex-shrink-0"
                      >
                        {getStatusText(questionStatuses[item.id])}
                      </span>
                    )}

                    {/* 가시성 배지 */}
                    <span
                      style={getVisibilityBgColor(item.visibility)}
                      className="px-2 py-1 text-xs rounded-full flex-shrink-0"
                    >
                      {getVisibilityText(item.visibility)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 ml-0 sm:ml-4">
                    {/* 작성자 정보 */}
                    <div className="text-xs sm:text-sm text-gray-500">
                      {item.authorNickname}
                    </div>

                    {/* 작성일 정보 */}
                    <div className="text-xs sm:text-sm text-gray-500">
                      {formatSimpleDate(item.createdAt)}
                    </div>

                    {/* 화살표 아이콘 */}
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>
              </li>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm sm:text-base">
              {keyword
                ? `"${keyword}"에 대한 검색 결과가 없습니다.`
                : "등록된 문의가 없습니다."}
            </div>
          )}
        </ul>
      </div>

      {/* 페이지네이션 컴포넌트 */}
      {totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
};

// 메인 QnA 페이지 컴포넌트
export default function QnAPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const router = useRouter();

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1) {
      setCurrentPage(page);
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(inputValue);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 검색어 초기화
  const handleClearSearch = () => {
    setInputValue("");
    setSearchKeyword("");
    setCurrentPage(1);
  };

  // 문의 작성 페이지로 이동
  const handleCreateQuestion = () => {
    router.push("/qna/create");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 sm:py-8">
          {/* 페이지 타이틀 영역 */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold">QnA</h1>
              <button
                onClick={handleCreateQuestion}
                className="bg-[#6E4213] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-[#5a360f] transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                문의 작성
              </button>
            </div>
          </div>

          {/* 검색 영역 */}
          <div className="mb-4 sm:mb-6">
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="문의 제목으로 검색..."
                className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6E4213] focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-[#6E4213] text-white px-3 sm:px-4 py-2 rounded-md hover:bg-[#5a360f] transition-colors text-sm sm:text-base flex-1 sm:flex-none"
                >
                  검색
                </button>
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  >
                    초기화
                  </button>
                )}
              </div>
            </form>
            {searchKeyword && (
              <div className="mt-2 text-xs sm:text-sm text-gray-600">
                검색어: "{searchKeyword}"
              </div>
            )}
          </div>

          {/* 문의 목록 및 페이지네이션 */}
          <QuestionList
            currentPage={currentPage}
            onPageChange={handlePageChange}
            keyword={searchKeyword}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
