"use client";

import { useState, useEffect } from "react";
import { CafeDetail } from "@/data/cafeDetails";
import Button from "@/components/common/Button";
import { getWishlistCategories, sanitizeWishlistCategories } from "@/lib/api";
import WishlistModal from "@/components/modals/WishlistModal";
import LoginPromptModal from "@/components/modals/LoginPromptModal";
import { useAuth } from "@/contexts/AuthContext";

interface CafeInfoSectionProps {
  cafe: CafeDetail;
  cafeId: string;
  onChatRoom: () => void;
  onShare: () => void;
  onSave: () => void;
  onWriteReview: () => void;
}

export default function CafeInfoSection({
  cafe,
  cafeId,
  onChatRoom,
  onShare,
  onSave,
  onWriteReview,
}: CafeInfoSectionProps) {
  const { isAuthenticated } = useAuth();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // 상세 시간 토글은 사용하지 않음 (백엔드에서 추가 정보 미제공)
  const [showHoursDetail] = useState<boolean>(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistCategories, setWishlistCategories] = useState<string[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // 긴 설명 더보기 토글
  const [showFullDescription, setShowFullDescription] = useState(false);
  const DESCRIPTION_LIMIT = 100; // 글자수 제한

  // 운영시간 토글
  const [showFullHours, setShowFullHours] = useState(false);

  // 운영시간 파싱 함수
  const parseHours = (hoursStr: string) => {
    if (!hoursStr) return { lines: [], firstLine: "", currentDayLine: "" };
    const lines = hoursStr.split("\n").filter((line) => line.trim());

    // 오늘 요일 찾기
    const today = new Date().getDay(); // 0: 일, 1: 월, 2: 화, ..., 6: 토
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const todayName = dayNames[today];

    // 오늘 요일에 해당하는 라인 찾기
    let currentDayLine = "";
    const regex = new RegExp(`^${todayName}\\s`);
    for (const line of lines) {
      if (regex.test(line)) {
        currentDayLine = line;
        break;
      }
    }

    return {
      lines,
      firstLine: lines[0] || "",
      currentDayLine: currentDayLine || lines[0] || "",
    };
  };

  // 이미지 배열 계산 (photoUrl도 포함)
  const getCafeImages = () => {
    const images: string[] = [];

    // 1. photoUrl이 있으면 먼저 추가
    if ((cafe as any).photoUrl) {
      images.push((cafe as any).photoUrl);
    }

    // 2. images 배열이 있으면 추가 (photoUrl과 중복되지 않도록)
    if (cafe.images && Array.isArray(cafe.images) && cafe.images.length > 0) {
      cafe.images.forEach((img: string) => {
        if (img && !images.includes(img)) {
          images.push(img);
        }
      });
    }

    // 3. photo_url (snake_case)도 확인
    if ((cafe as any).photo_url && !images.includes((cafe as any).photo_url)) {
      images.push((cafe as any).photo_url);
    }

    // 디버깅 로그
    if (process.env.NODE_ENV === "development" && images.length === 0) {
      console.log("[CafeInfoSection] 이미지 없음 - cafe 객체:", {
        photoUrl: (cafe as any).photoUrl,
        images: cafe.images,
        photo_url: (cafe as any).photo_url,
      });
    }

    return images;
  };

  const nextImage = () => {
    const images = getCafeImages();
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = getCafeImages();
    if (images.length > 0) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + images.length) % images.length
      );
    }
  };

  // 위시리스트 카테고리 로드
  const loadWishlistCategories = async () => {
    try {
      setWishlistLoading(true);
      const response = await getWishlistCategories(cafeId);
      setWishlistCategories(
        sanitizeWishlistCategories(
          Array.isArray(response?.data) ? response.data : []
        )
      );
    } catch (error: any) {
      console.error("위시리스트 카테고리 로드 실패:", error);
      // 403 오류인 경우 로그인 유도 모달 표시
      if (error?.response?.status === 403) {
        setShowLoginPrompt(true);
      }
      // 백엔드 서버가 실행되지 않은 경우 빈 배열로 초기화
      setWishlistCategories([]);
    } finally {
      setWishlistLoading(false);
    }
  };

  // 위시리스트 모달 열기 (로그인 상태 확인)
  const handleWishlistClick = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    await loadWishlistCategories();
    setShowWishlistModal(true);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistCategories([]);
      return;
    }
    loadWishlistCategories();
  }, [cafeId, isAuthenticated]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
        {/* 좌측 이미지 영역 */}
        <div className="relative">
          <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden relative">
            {(() => {
              const images = getCafeImages();
              const currentImage =
                images && images.length > 0 ? images[currentImageIndex] : null;

              if (currentImage) {
                return (
                  <img
                    src={currentImage}
                    alt={`${cafe.name} 이미지`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 이미지 로드 실패 시 플레이스홀더 표시
                      e.currentTarget.style.display = "none";
                    }}
                  />
                );
              }

              // 이미지가 없을 때 플레이스홀더
              return (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-2">☕</div>
                    <div className="text-lg font-medium">카페 이미지</div>
                  </div>
                </div>
              );
            })()}

            {/* 이미지 네비게이션 버튼 (여러 이미지가 있을 때만) */}
            {(() => {
              const images = getCafeImages();
              return images && images.length > 1;
            })() && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
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
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
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

                {/* 이미지 인디케이터 */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 z-10">
                  {getCafeImages().map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "bg-white"
                          : "bg-white bg-opacity-50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 우측 상세 정보 */}
        <div className="space-y-4 sm:space-y-6 w-full lg:w-3/4">
          {/* 카페 이름 */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {cafe.name}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              {cafe.slogan}
            </p>
          </div>

          {/* 위치 정보 */}
          <div className="space-y-4">
            {/* 주소 */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                <svg
                  className="w-full h-full text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium">{cafe.address}</p>
                <p className="text-sm text-gray-600 mt-1">{cafe.subway}</p>
              </div>
            </div>

            {/* 연락처 */}
            {cafe.phone && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex-shrink-0">
                  <svg
                    className="w-full h-full text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <a
                  href={`tel:${cafe.phone}`}
                  className="text-gray-900 underline"
                >
                  {cafe.phone}
                </a>
              </div>
            )}

            {/* 영업시간 (백엔드에서 추가 세부정보 미제공 → 단순 표시) */}
            {cafe.hoursDetail?.fullHours &&
              (() => {
                const { lines, currentDayLine } = parseHours(
                  cafe.hoursDetail.fullHours
                );
                const hasMultipleLines = lines.length > 1;

                return (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1">
                        <span className="text-gray-600">운영시간:</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-900 font-medium">
                            {currentDayLine}
                          </span>
                          {hasMultipleLines && (
                            <>
                              {showFullHours &&
                                lines.map((line, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-gray-900 ${
                                      line === currentDayLine
                                        ? "font-medium underline underline-offset-2"
                                        : ""
                                    }`}
                                  >
                                    {line}
                                  </span>
                                ))}
                              <button
                                type="button"
                                onClick={() => setShowFullHours(!showFullHours)}
                                className="text-primary text-sm underline underline-offset-2 text-left"
                              >
                                {showFullHours ? "접기" : "더보기"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button
              onClick={onChatRoom}
              color="primary"
              size="md"
              className="w-full sm:w-auto"
            >
              채팅방 참여
            </Button>
            <div className="flex gap-2">
              <button
                onClick={handleWishlistClick}
                className={`flex flex-col items-center justify-center border rounded-lg h-12 w-16 sm:w-20 transition-colors ${
                  wishlistCategories.length > 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary hover:bg-gray-50"
                }`}
              >
                {wishlistLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mb-1"></div>
                ) : (
                  <svg
                    className={`w-5 h-5 mb-1 ${
                      wishlistCategories.length > 0
                        ? "text-primary"
                        : "text-primary"
                    }`}
                    fill={
                      wishlistCategories.length > 0 ? "currentColor" : "none"
                    }
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                )}
                <span
                  className={`text-xs ${
                    wishlistCategories.length > 0
                      ? "text-primary font-medium"
                      : "text-gray-900"
                  }`}
                >
                  {wishlistCategories.length > 0 ? "위시리스트" : "저장"}
                </span>
              </button>
              <button
                onClick={onShare}
                className="flex flex-col items-center justify-center border border-primary rounded-lg h-12 w-16 sm:w-20 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-primary mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                <span className="text-xs text-gray-900">공유</span>
              </button>
            </div>
          </div>

          {/* 리뷰 작성 필드 */}
          <div>
            <input
              type="text"
              placeholder="| 리뷰 작성"
              onClick={onWriteReview}
              className="w-full px-4 py-3 border border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer text-gray-900"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* 위시리스트 모달 */}
      {showWishlistModal && (
        <WishlistModal
          onClose={() => setShowWishlistModal(false)}
          selectedCategories={wishlistCategories}
          onCategoriesChange={setWishlistCategories}
          cafeId={cafeId}
          cafeName={cafe.name}
        />
      )}

      {/* 로그인 유도 모달 */}
      {showLoginPrompt && (
        <LoginPromptModal
          onClose={() => setShowLoginPrompt(false)}
          message="로그인 후 위시리스트 기능을 이용할 수 있습니다."
        />
      )}
    </div>
  );
}
