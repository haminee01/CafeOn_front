"use client";

import { useState, useEffect } from "react";
import { Cafe } from "@/types/cafe";
import CafeCard from "./CafeCard";

interface CafeCarouselProps {
  cafes: Cafe[];
  className?: string;
  title?: string;
  description?: string;
  showAllButton?: boolean;
}

const CafeCarousel: React.FC<CafeCarouselProps> = ({
  cafes,
  className = "",
  title = "추천 카페",
  description = "추천드리는 카페예요.",
  showAllButton = true,
}) => {
  const getIsMobile = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  };

  // 반응형 카드 수 계산
  const getCardsPerPage = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // 노트북/데스크탑
    if (width >= 768) return 4; // 아이패드
    return 2; // 모바일
  };

  const [currentPage, setCurrentPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(getCardsPerPage());
  const [isMobile, setIsMobile] = useState(getIsMobile());

  useEffect(() => {
    const handleResize = () => {
      setCardsPerPage(getCardsPerPage());
      setIsMobile(getIsMobile());
      setCurrentPage(0); // 화면 크기 변경 시 첫 페이지로 리셋
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.ceil(cafes.length / cardsPerPage);

  const goToPrevious = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
  };

  const goToNext = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
  };

  const startIndex = currentPage * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const currentCafes = cafes.slice(startIndex, endIndex);

  if (cafes.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-600">표시할 카페가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">
        {title}
      </h2>
      <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-4 sm:mb-5 lg:mb-6">
        {description}
      </p>

      <div className="relative">
        {/* 모바일에서는 손가락으로 좌우 스크롤 가능하도록 전체 카드 노출 */}
        {isMobile ? (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cafes.map((cafe) => (
              <div key={cafe.cafe_id} className="min-w-[48%] snap-start">
                <CafeCard cafe={cafe} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 px-0 sm:px-1 md:px-8 lg:px-12">
            {currentCafes.map((cafe) => (
              <CafeCard key={cafe.cafe_id} cafe={cafe} />
            ))}
          </div>
        )}

        {/* 좌우 버튼 - 카드 그리드 양 옆에 배치 (데스크탑에서만 표시) */}
        {cardsPerPage >= 4 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={currentPage === 0}
              className={`hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full transition-colors z-10 ${
                currentPage === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-lg border"
              }`}
            >
              <svg
                className="w-5 h-5"
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
            </button>

            <button
              onClick={goToNext}
              disabled={currentPage === totalPages - 1}
              className={`hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full transition-colors z-10 ${
                currentPage === totalPages - 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-lg border"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* 페이지 인디케이터 */}
        {!isMobile && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPage ? "bg-gray-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CafeCarousel;
