"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MapComponent from "@/components/map/Map";
import { getWishlist, getNearbyCafes, getHotCafes, getCafeDetail } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { getAccessToken } from "@/stores/authStore";

type TabType = "home" | "saved" | "popular";
type SavedCategoryType =
  | "all"
  | "hideout"
  | "work"
  | "atmosphere"
  | "taste"
  | "planned";

interface WishlistItem {
  wishlistId: number;
  cafeId: number;
  name: string;
  category: string;
}

interface MapCafe {
  cafe_id: string;
  cafeId?: number | string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  images?: string[];
}

export default function MapPage() {
  const router = useRouter();
  const [selectedCafe, setSelectedCafe] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [savedCategory, setSavedCategory] = useState<SavedCategoryType>("all");
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [savedCafes, setSavedCafes] = useState<MapCafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearbyCafes, setNearbyCafes] = useState<any[]>([]);
  const [popularCafes, setPopularCafes] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 카테고리 매핑
  const categoryMap: Record<SavedCategoryType, string> = {
    all: "all",
    hideout: "HIDEOUT",
    work: "WORK",
    atmosphere: "ATMOSPHERE",
    taste: "TASTE",
    planned: "PLANNED",
  };

  // 로그인 상태 확인
  useEffect(() => {
    const token = getAccessToken();
    setIsLoggedIn(!!token);
  }, []);

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          // 기본 위치 (서울 시청)
          setUserLocation({ latitude: 37.5665, longitude: 126.978 });
        }
      );
    } else {
      // 기본 위치 (서울 시청)
      setUserLocation({ latitude: 37.5665, longitude: 126.978 });
    }
  }, []);

  // 근처 카페 조회
  useEffect(() => {
    if (userLocation && activeTab === "home") {
      fetchNearbyCafes();
    }
  }, [userLocation, activeTab]);

  // 인기 카페 조회
  useEffect(() => {
    if (activeTab === "popular") {
      fetchPopularCafes();
    }
  }, [activeTab]);

  // 위시리스트 조회
  useEffect(() => {
    const token = getAccessToken();
    // 로그인된 경우에만 위시리스트 조회
    if (activeTab === "saved" && token) {
      fetchWishlist();
    } else {
      setWishlistItems([]);
      setLoading(false);
    }
  }, [activeTab, savedCategory]);

  const fetchNearbyCafes = async () => {
    if (!userLocation) return;

    try {
      const cafes = await getNearbyCafes({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: 2000, // 2km 반경
      });

      // API가 배열을 반환하면 그대로 사용, 이미지 있는 카페만 필터링
      if (Array.isArray(cafes) && cafes.length > 0) {
        const cafesWithImages = cafes.filter(
          (cafe) => cafe.photoUrl || (cafe.images && cafe.images.length > 0)
        );
        if (cafesWithImages.length > 0) {
          setNearbyCafes(cafesWithImages);
          return;
        }
      }

      // 근처 데이터가 없으면 인기 카페로 fallback
      const fallbackCafes = await getHotCafes();
      if (Array.isArray(fallbackCafes)) {
        setNearbyCafes(fallbackCafes.slice(0, 20));
      } else {
        setNearbyCafes([]);
      }
    } catch (error: any) {
      console.error("근처 카페 조회 실패:", error);
      try {
        const fallbackCafes = await getHotCafes();
        setNearbyCafes(Array.isArray(fallbackCafes) ? fallbackCafes.slice(0, 20) : []);
      } catch {
        setNearbyCafes([]);
      }
    }
  };

  const fetchPopularCafes = async () => {
    setLoading(true);
    try {
      const cafes = await getHotCafes();

      // API가 배열을 반환하면 그대로 사용, 이미지 있는 카페만 필터링
      if (Array.isArray(cafes) && cafes.length > 0) {
        const cafesWithImages = cafes.filter(
          (cafe) => cafe.photoUrl || (cafe.images && cafe.images.length > 0)
        );
        setPopularCafes(cafesWithImages);
      } else {
        // 빈 배열 반환
        setPopularCafes([]);
      }
    } catch (error: any) {
      console.error("인기 카페 조회 실패:", error);
      // API 실패 시 빈 배열 반환
      setPopularCafes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      // "all"인 경우 모든 카테고리를 개별적으로 조회하고 합치기
      if (savedCategory === "all") {
        const allCategories = [
          "HIDEOUT",
          "WORK",
          "ATMOSPHERE",
          "TASTE",
          "PLANNED",
        ];
        const allPromises = allCategories.map(
          (category) =>
            getWishlist({
              page: 0,
              size: 20,
              category,
            }).catch(() => ({ data: { content: [] } })) // 개별 카테고리 실패 시 빈 배열
        );

        const allResponses = await Promise.all(allPromises);
        const allItems = allResponses.flatMap(
          (response) => response?.data?.content || response?.content || []
        );

        // 중복 제거 (같은 cafeId가 여러 카테고리에 있을 수 있음)
        // JavaScript 네이티브 Map 객체 사용 (React 컴포넌트 Map과 구분)
        const itemsMap = new Map(
          allItems.map((item) => [item.cafeId || item.wishlistId, item])
        );
        const uniqueItems = Array.from(itemsMap.values());

        setWishlistItems(uniqueItems);
        await hydrateSavedCafes(uniqueItems);
      } else {
        // 특정 카테고리 조회
        const params: any = {
          page: 0,
          size: 20,
          category: categoryMap[savedCategory],
        };

        const response = await getWishlist(params);
        const items = response?.data?.content || response?.content || [];
        setWishlistItems(items);
        await hydrateSavedCafes(items);
      }
    } catch (error: any) {
      console.error("위시리스트 조회 실패:", error);

      // 403 또는 401 에러인 경우 (권한 없음)
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log("로그인이 필요합니다.");
        useAuthStore.getState().logout();
      }

      setWishlistItems([]);
      setSavedCafes([]);
    } finally {
      setLoading(false);
    }
  };

  const hydrateSavedCafes = async (items: WishlistItem[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      setSavedCafes([]);
      return;
    }

    const cafes = await Promise.all(
      items.map(async (item) => {
        try {
          const detail = (await getCafeDetail(String(item.cafeId))) as any;
          return {
            ...detail,
            cafe_id: String(detail.cafe_id || detail.cafeId || item.cafeId),
            cafeId: detail.cafeId || detail.cafe_id || item.cafeId,
          } as MapCafe;
        } catch {
          return null;
        }
      })
    );
    setSavedCafes(cafes.filter(Boolean) as MapCafe[]);
  };

  // 탭별 카페 데이터
  const getCafesByTab = () => {
    switch (activeTab) {
      case "home":
        return nearbyCafes; // API 데이터
      case "saved":
        return savedCafes;
      case "popular":
        return popularCafes; // 인기 카페 API 데이터
      default:
        return [];
    }
  };

  const currentCafes = getCafesByTab();

  return (
    <div className="min-h-screen relative">
      {/* 지도 (전체 화면) */}
      <MapComponent className="h-screen" cafes={getCafesByTab()} />

      {/* 통합 모달 - 탭과 리스트가 함께 */}
      <div className="absolute bg-white top-1/2 left-2 sm:left-4 transform -translate-y-1/2 w-[calc(100%-1rem)] sm:w-80 md:min-w-96 max-w-sm md:max-w-none h-[50vh] sm:h-[60vh] rounded-lg shadow-lg z-20 flex flex-col">
        {/* 헤더 */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <h2 className="text-base sm:text-lg font-semibold text-primary">
            CafeOn.
          </h2>
        </div>

        {/* 저장 탭 하위 카테고리 탭들 - 위쪽에 배치 */}
        {activeTab === "saved" && (
          <div className="px-3 sm:px-4 pb-2">
            <div className="flex gap-1 flex-wrap max-w-full">
              <button
                onClick={() => setSavedCategory("all")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "all"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSavedCategory("hideout")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "hideout"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="hidden sm:inline">나만의 아지트</span>
                <span className="sm:hidden">아지트</span>
              </button>
              <button
                onClick={() => setSavedCategory("work")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "work"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="hidden sm:inline">작업하기 좋은</span>
                <span className="sm:hidden">작업</span>
              </button>
              <button
                onClick={() => setSavedCategory("atmosphere")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "atmosphere"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                분위기
              </button>
              <button
                onClick={() => setSavedCategory("taste")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "taste"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="hidden sm:inline">커피, 디저트 맛집</span>
                <span className="sm:hidden">맛집</span>
              </button>
              <button
                onClick={() => setSavedCategory("planned")}
                className={`px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md transition-colors flex-shrink-0 ${
                  savedCategory === "planned"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="hidden sm:inline">방문예정, 찜</span>
                <span className="sm:hidden">찜</span>
              </button>
            </div>
          </div>
        )}
        {/* 메인 콘텐츠 영역 */}
        <div className="flex flex-1 px-2 sm:px-4 pb-3 sm:pb-4 min-h-0">
          {/* 탭 버튼들 */}
          <div className="flex flex-col justify-start">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center justify-center px-1 sm:px-2 py-1 sm:py-2 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 transition-colors ${
                activeTab === "home"
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg
                  width="16"
                  height="20"
                  className="sm:w-5 sm:h-6"
                  viewBox="0 0 24 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 0C5.373 0 0 5.373 0 12c0 7.5 12 20 12 20s12-12.5 12-20c0-6.627-5.373-12-12-12z"
                    fill="currentColor"
                  />
                  <circle cx="12" cy="12" r="6" fill="white" />
                </svg>
                <span className="text-[10px] sm:text-xs md:text-sm hidden sm:inline">
                  지도 홈
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center justify-center px-1 sm:px-2 py-1 sm:py-2 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 transition-colors ${
                activeTab === "saved"
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col">
                <svg
                  width="18"
                  height="18"
                  className="sm:w-5 sm:h-5 md:w-6 md:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-[10px] sm:text-xs md:text-sm hidden sm:inline">
                  저장
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("popular")}
              className={`flex items-center justify-center px-1 sm:px-2 py-1 sm:py-2 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 transition-colors ${
                activeTab === "popular"
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg
                  width="18"
                  height="18"
                  className="sm:w-5 sm:h-5 md:w-6 md:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-[10px] sm:text-xs md:text-sm hidden sm:inline">
                  인기
                </span>
              </div>
            </button>
          </div>

          {/* 카페 카드 리스트 */}
          <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto ml-2 sm:ml-4">
            {/* 로그인 안내 메시지 */}
            {activeTab === "saved" && !isLoggedIn && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <svg
                  className="w-16 h-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  로그인이 필요합니다
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  저장된 카페를 보려면 로그인해주세요
                </p>
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  로그인하기
                </button>
              </div>
            )}
            {loading && (
              <div className="text-center py-4 text-gray-500">로딩 중...</div>
            )}
            {!loading &&
              activeTab === "saved" &&
              isLoggedIn &&
              wishlistItems.length === 0 &&
              !loading && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">저장된 카페가 없습니다.</p>
                  <p className="text-sm">카페를 저장하면 여기에 표시됩니다.</p>
                </div>
              )}
            {!loading &&
              currentCafes.length > 0 &&
              currentCafes.map((cafe) => {
                if (!cafe) return null;

                // 카페 ID 확인 (API 데이터의 경우 cafeId, mock 데이터의 경우 cafe_id)
                const cafeId = cafe.cafeId || cafe.cafe_id;

                const handleCardClick = () => {
                  if (cafeId) {
                    router.push(`/cafes/${cafeId}`);
                  }
                };

                return (
                  <div
                    key={String(cafe.cafe_id || cafe.cafeId || cafe.name)}
                    className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCafe === String(cafe.cafe_id || cafe.cafeId)
                        ? "border-amber-300 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={handleCardClick}
                  >
                    <div className="flex gap-2 sm:gap-3">
                      {/* 카페 이미지 */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {(() => {
                          const imageUrl =
                            cafe.photoUrl ||
                            cafe.photo_url ||
                            (cafe.images &&
                            Array.isArray(cafe.images) &&
                            cafe.images.length > 0
                              ? cafe.images[0]
                              : null);

                          if (imageUrl) {
                            return (
                              <>
                                <img
                                  src={imageUrl}
                                  alt={cafe.name || "카페 이미지"}
                                  className="w-full h-full object-cover relative z-10"
                                  onError={(e) => {
                                    // 이미지 로드 실패 시 플레이스홀더 표시
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                                {/* 플레이스홀더 (이미지 로드 실패 시에만 보임) */}
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 -z-10">
                                  <span className="text-gray-400 text-xs">
                                    이미지
                                  </span>
                                </div>
                              </>
                            );
                          }
                          // 이미지가 없을 때 플레이스홀더
                          return (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                              <span className="text-gray-400 text-xs">
                                이미지
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 카페 정보 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 truncate">
                          {cafe.name}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1 sm:mb-2">
                          {activeTab === "saved" &&
                            savedCategory === "hideout" &&
                            "나만의 아지트 카페"}
                          {activeTab === "saved" &&
                            savedCategory === "work" &&
                            "작업하기 좋은 카페"}
                          {activeTab === "saved" &&
                            savedCategory === "atmosphere" &&
                            "분위기 좋은 카페"}
                          {activeTab === "saved" &&
                            savedCategory === "taste" &&
                            "커피, 디저트 맛집"}
                          {activeTab === "saved" &&
                            savedCategory === "planned" &&
                            "방문예정, 찜한 카페"}
                          {activeTab === "saved" &&
                            savedCategory === "all" &&
                            "저장된 카페"}
                          {activeTab === "home" && "영업 중 리뷰 999+"}
                          {activeTab === "popular" && "인기 카페 리뷰 999+"}
                        </p>
                        <div className="flex gap-1 sm:gap-2">
                          <button className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded text-[10px] sm:text-xs">
                            {activeTab === "saved" &&
                              savedCategory === "hideout" &&
                              "🏠 나만의 아지트"}
                            {activeTab === "saved" &&
                              savedCategory === "work" &&
                              "💻 작업하기 좋은"}
                            {activeTab === "saved" &&
                              savedCategory === "atmosphere" &&
                              "✨ 분위기"}
                            {activeTab === "saved" &&
                              savedCategory === "taste" &&
                              "☕ 맛집"}
                            {activeTab === "saved" &&
                              savedCategory === "planned" &&
                              "📅 방문예정"}
                            {activeTab === "saved" &&
                              savedCategory === "all" &&
                              "💾 저장됨"}
                            {activeTab === "home" && "베이커리"}
                            {activeTab === "popular" && "🔥 인기"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
