"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Cafe } from "@/types/cafe";
import SearchBar from "@/components/common/SearchBar";
import CategoryFilter from "app/(main)/search/components/CategoryFilter";
import CafeGrid from "@/components/cafes/CafeGrid";
import Pagination from "@/components/common/Pagination";
import { searchCafes } from "@/lib/api";

// 반응형 아이템 수 설정
const getItemsPerPage = () => {
  if (typeof window === "undefined") return 8; // SSR 시 기본값

  const width = window.innerWidth;
  if (width >= 1536) return 16; // 2xl: 4x4 그리드
  if (width >= 1280) return 12; // xl: 4x3 그리드
  if (width >= 1024) return 8; // lg: 4x2 그리드
  if (width >= 768) return 6; // md: 3x2 그리드
  if (width >= 640) return 4; // sm: 2x2 그리드
  return 2; // 기본: 2x1 그리드
};

function SearchResultsPageContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [itemsPerPage, setItemsPerPage] = useState(8); // 반응형 아이템 수
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true); // 초기 로딩 상태를 true로 설정

  // URL 파라미터에서 검색어 가져오기
  useEffect(() => {
    const query = searchParams.get("q") || "";
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  // 검색어/태그 변경 시 API 호출 (초기 로드 포함)
  useEffect(() => {
    const fetchCafes = async () => {
      setLoading(true);
      try {
        const results = await searchCafes(
          searchQuery,
          selectedCategory || undefined
        );
        // 이미지가 있는 카페만 필터링
        const cafesWithImages = results.filter(
          (cafe) => cafe.photoUrl || (cafe.images && cafe.images.length > 0)
        );
        setCafes(cafesWithImages);
      } catch (error: any) {
        console.error("카페 검색 실패:", error);
        setCafes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCafes();
  }, [searchQuery, selectedCategory]);

  // 화면 크기 변화 감지하여 아이템 수 업데이트
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(getItemsPerPage());
    };

    // 초기 설정
    updateItemsPerPage();

    // 리사이즈 이벤트 리스너 추가
    window.addEventListener("resize", updateItemsPerPage);

    // 클린업
    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, []);

  // 페이지네이션
  const totalPages = Math.ceil(cafes.length / itemsPerPage);

  // 현재 페이지가 총 페이지 수를 초과하면 첫 페이지로 조정
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // 아이템 수가 변경되면 현재 페이지도 조정
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [itemsPerPage, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCafes = cafes.slice(startIndex, endIndex);

  // 검색된 카페들의 태그 중복 제거 및 정렬 (원본 카페 목록 기준)
  const availableTags = useMemo(() => {
    // 모든 카페들의 태그 수집 (필터링 전 원본 카페 목록)
    const allTags = cafes.flatMap((cafe) => cafe.tags || []);

    // 태그별 개수 계산
    const tagCounts = new Map<string, number>();
    allTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    // 개수가 많은 순으로 정렬하고 상위 10개만 반환
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1]) // 개수가 많은 순
      .slice(0, 10) // 상위 10개만
      .map(([tag]) => tag);
  }, [cafes]);

  const handleCategoryChange = (category: string) => {
    // 같은 카테고리를 클릭하면 해제, 다른 카테고리를 클릭하면 선택
    if (selectedCategory === category) {
      setSelectedCategory(""); // 카테고리 해제
    } else {
      setSelectedCategory(category); // 카테고리 선택
    }
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 스크롤을 맨 위로
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 검색 시 첫 페이지로
    // URL 업데이트
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="page-shell">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        placeholder="어떤 카페를 찾아볼까요?"
      />

      <div className="content-container">
        {/* 카테고리 필터 - 검색 결과의 태그 표시 */}
        {availableTags.length > 0 && (
          <div className="mb-6 sm:mb-8 flex justify-center">
            <CategoryFilter
              categories={availableTags}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        )}
        {/* 카페 그리드 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">검색 중...</div>
          </div>
        ) : (
          <div>
            <CafeGrid
              cafes={paginatedCafes}
              columns={
                itemsPerPage >= 16
                  ? 4
                  : itemsPerPage >= 12
                  ? 4
                  : itemsPerPage >= 8
                  ? 4
                  : itemsPerPage >= 6
                  ? 3
                  : itemsPerPage >= 4
                  ? 2
                  : 2
              }
              className="mb-2"
            />
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#6E4213] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">검색 결과를 불러오는 중입니다.</p>
          </div>
        </div>
      }
    >
      <SearchResultsPageContent />
    </Suspense>
  );
}
