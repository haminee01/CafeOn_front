"use client";

import { useState, useEffect } from "react";
import { CafeReview } from "@/data/cafeDetails";
import Button from "@/components/common/Button";
import {
  getCafeReviews,
  deleteReview,
  reportReview,
  getCafeDetail,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToastContext } from "@/components/common/ToastProvider";
import ReportReviewModal from "@/components/modals/ReportReviewModal";
import LoginPromptModal from "@/components/modals/LoginPromptModal";
import ProfileIcon from "@/components/chat/ProfileIcon";
import { formatRelativeTime } from "@/utils/dateFormat";
import { getAccessToken } from "@/stores/authStore";

interface ReviewSectionProps {
  cafeId: string;
  onReportReview: () => void;
  onWriteReview: () => void;
  onEditReview?: (review: CafeReview) => void;
  refreshTrigger?: number; // 리뷰 새로고침 트리거
  initialReviews?: any[]; // 카페 상세 API에서 가져온 리뷰 목록
}

// 백엔드 API 응답 타입
interface ApiReview {
  reviewId: number;
  rating: number;
  content: string;
  createdAt: string;
  reviewerId: string;
  reviewerNickname: string;
  reviewerProfileImageUrl?: string;
  images?: any[]; // 이미지 정보
}

export default function ReviewSection({
  cafeId,
  onReportReview,
  onWriteReview,
  onEditReview,
  refreshTrigger,
  initialReviews = [],
}: ReviewSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToastContext();
  const [reviews, setReviews] = useState<CafeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenuFor, setShowMenuFor] = useState<number | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(
    null
  );
  const [reportingReviewAuthor, setReportingReviewAuthor] =
    useState<string>("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [sortBy, setSortBy] = useState<
    "latest" | "rating-high" | "rating-low" | "likes"
  >("latest");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const INITIAL_REVIEWS_LIMIT = 5;

  const normalizeReview = (r: any): CafeReview => {
    let reviewImages: string[] = [];
    if (r.images && Array.isArray(r.images)) {
      reviewImages = r.images
        .map((img: any) => {
          if (typeof img === "object" && img !== null) {
            return (
              img.imageUrl ||
              img.image_url ||
              img.url ||
              img.publicUrl ||
              img.originalFileName ||
              ""
            );
          }
          return img || "";
        })
        .filter((url: string) => url && url.trim() !== "");
    }

    const rawCreatedAt = r.createdAt || r.created_at || r.date || "";
    return {
      id: Number(r.reviewId ?? r.id ?? Date.now()),
      user: r.reviewerNickname || r.user || "익명",
      rating: Number(r.rating ?? 0),
      content: r.content || "",
      date: rawCreatedAt ? formatRelativeTime(rawCreatedAt) : "방금 전",
      createdAt: rawCreatedAt,
      likes: Number(r.likes ?? 0),
      images: reviewImages,
      reviewerId: r.reviewerId,
      profileImageUrl: r.reviewerProfileImageUrl || r.profileImageUrl,
    } as CafeReview;
  };

  // initialReviews 또는 sortBy 변경 시 리뷰 목록 새로고침 및 정렬
  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        let sourceReviews = Array.isArray(initialReviews) ? initialReviews : [];

        // 상세 API에 리뷰가 비어있으면 리뷰 API를 fallback으로 호출
        if (sourceReviews.length === 0) {
          const response = await getCafeReviews(cafeId);
          sourceReviews = Array.isArray(response?.reviews) ? response.reviews : [];
        }

        if (sourceReviews.length === 0) {
          setReviews([]);
          return;
        }

        const transformedReviews: CafeReview[] = sourceReviews.map(normalizeReview);
        const sortedReviews = [...transformedReviews].sort((a, b) => {
          switch (sortBy) {
            case "rating-high":
              return (b.rating ?? 0) - (a.rating ?? 0);
            case "rating-low":
              return (a.rating ?? 0) - (b.rating ?? 0);
            case "likes":
              return b.likes - a.likes;
            case "latest":
            default:
              const dateA = (a as any).createdAt
                ? new Date((a as any).createdAt).getTime()
                : 0;
              const dateB = (b as any).createdAt
                ? new Date((b as any).createdAt).getTime()
                : 0;
              return dateB - dateA;
          }
        });
        setReviews(sortedReviews);
      } catch (error) {
        console.error("리뷰 로딩 실패:", error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReviews, sortBy, cafeId]);

  // refreshTrigger 변경 시 리뷰 목록 새로고침 (강제 API 재호출)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      const forceRefreshReviews = async () => {
        try {
          setLoading(true);

          // refreshTrigger가 변경되면 강제로 API에서 다시 가져오기
          const cafeData = await getCafeDetail(cafeId);
          const reviewData = cafeData.reviews || [];

          if (reviewData && reviewData.length > 0) {
            const transformedReviews: CafeReview[] = reviewData.map(normalizeReview);

            // 정렬 적용
            const sortedReviews = [...transformedReviews].sort((a, b) => {
              switch (sortBy) {
                case "rating-high":
                  return (b.rating ?? 0) - (a.rating ?? 0);
                case "rating-low":
                  return (a.rating ?? 0) - (b.rating ?? 0);
                case "rating-high":
                  return (b.rating ?? 0) - (a.rating ?? 0);
                case "rating-low":
                  return (a.rating ?? 0) - (b.rating ?? 0);
                case "likes":
                  return b.likes - a.likes;
                case "latest":
                default:
                  // 최신순은 원본 createdAt 날짜 기준 정렬
                  const dateA = (a as any).createdAt
                    ? new Date((a as any).createdAt).getTime()
                    : 0;
                  const dateB = (b as any).createdAt
                    ? new Date((b as any).createdAt).getTime()
                    : 0;
                  return dateB - dateA; // 최신순 (내림차순)
              }
            });

            setReviews(sortedReviews);
          } else {
            setReviews([]);
          }
        } catch (error: any) {
          console.error("리뷰 새로고침 실패:", error);
          // 에러가 발생해도 기존 리뷰는 유지
        } finally {
          setLoading(false);
        }
      };

      forceRefreshReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, sortBy]); // sortBy도 의존성에 추가하여 정렬 기준 변경 시 재정렬

  // 전역 사용자 프로필 이미지가 변경되면 리뷰 목록 업데이트
  useEffect(() => {
    console.log("[ReviewSection useEffect] 트리거됨:", {
      hasUser: !!user,
      isAuthenticated,
      hasProfileImageUrl: !!user?.profileImageUrl,
      profileImageUrl: user?.profileImageUrl,
    });

    if (user && isAuthenticated && user.profileImageUrl) {
      // user.userId가 없으면 JWT에서 추출
      let currentUserId = user.userId;
      if (!currentUserId) {
        try {
          const token = getAccessToken();
          if (token) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            currentUserId = payload.sub || "";
          }
        } catch (e) {
          console.error("JWT 파싱 실패:", e);
        }
      }

      if (currentUserId) {
        setReviews((prevReviews) => {
          console.log(
            "[ReviewSection setReviews] prevReviews:",
            prevReviews.map((r) => ({
              id: r.id,
              reviewerId: r.reviewerId,
              user: r.user,
            }))
          );

          const updatedReviews = prevReviews.map((review) => {
            const isMatch = review.reviewerId === currentUserId;
            if (isMatch) {
              console.log("[ReviewSection] 매칭되는 리뷰 발견:", {
                reviewId: review.id,
                reviewerId: review.reviewerId,
                reviewerNickname: review.user,
                newProfileImageUrl: user.profileImageUrl,
              });
            }
            return isMatch
              ? {
                  ...review,
                  profileImageUrl: user.profileImageUrl ?? undefined,
                }
              : review;
          });

          // 디버깅 로그
          const matchedCount = updatedReviews.filter(
            (r) => r.reviewerId === currentUserId
          ).length;
          console.log("[ReviewSection] 프로필 이미지 업데이트:", {
            currentUserId,
            profileImageUrl: user.profileImageUrl,
            reviewsCount: prevReviews.length,
            matchedReviewsCount: matchedCount,
          });

          return updatedReviews;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profileImageUrl, user?.userId, isAuthenticated]);

  const toggleMenu = (reviewId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMenuFor(showMenuFor === reviewId ? null : reviewId);
  };

  // 리뷰 작성자인지 확인하는 함수
  const isMyReview = (review: CafeReview) => {
    if (!user || !isAuthenticated) return false;

    // JWT 토큰에서 userId 추출 (user.userId가 없을 경우 대비)
    let currentUserId = user.userId;

    // user.userId가 비어 있으면 JWT에서 추출 시도
    if (!currentUserId) {
      try {
        const token = getAccessToken();
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          currentUserId = payload.sub || "";
        }
      } catch (e) {
        console.error("JWT 파싱 실패:", e);
      }
    }

    // reviewerId가 있으면 사용자 ID로 비교
    if (review.reviewerId) {
      return currentUserId === review.reviewerId;
    }

    // reviewerId가 없으면 false 반환 (안전한 기본값)
    return false;
  };

  // 리뷰 작성 버튼 클릭 핸들러
  const handleWriteReview = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    onWriteReview();
  };

  const handleReport = (reviewId: number) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      setShowMenuFor(null);
      return;
    }

    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      setReportingReviewId(reviewId);
      setReportingReviewAuthor(review.user);
      setShowReportModal(true);
    }
    setShowMenuFor(null);
  };

  const handleEdit = (reviewId: number) => {
    if (!isAuthenticated) {
      showToast("로그인이 필요한 서비스입니다.", "error");
      return;
    }

    const review = reviews.find((r) => r.id === reviewId);
    if (!review) {
      showToast("리뷰를 찾을 수 없습니다.", "error");
      return;
    }

    // 본인 리뷰인지 확인
    if (!isMyReview(review)) {
      showToast("본인의 리뷰만 수정할 수 있습니다.", "error");
      return;
    }

    if (onEditReview) {
      onEditReview(review);
    }
    setShowMenuFor(null);
  };

  const handleDelete = async (reviewId: number) => {
    if (!isAuthenticated) {
      showToast("로그인이 필요한 서비스입니다.", "error");
      return;
    }

    try {
      await deleteReview(reviewId.toString());
      showToast("리뷰가 삭제되었습니다.", "success");
      // 리뷰 목록에서 제거
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error: any) {
      console.error("리뷰 삭제 실패:", error);
      showToast("리뷰 삭제에 실패했습니다.", "error");
    }
    setShowMenuFor(null);
  };

  // 외부 클릭 시 메뉴 닫기
  const handleClickOutside = () => {
    setShowMenuFor(null);
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            리뷰 모아보기
          </h2>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">리뷰를 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12" onClick={handleClickOutside}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">리뷰 모아보기</h2>

          {/* 정렬 버튼 */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setSortBy("latest")}
              className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                sortBy === "latest"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => setSortBy("rating-high")}
              className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                sortBy === "rating-high"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              평점 높은순
            </button>
            <button
              onClick={() => setSortBy("rating-low")}
              className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                sortBy === "rating-low"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              평점 낮은순
            </button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg mb-4">
              아직 작성된 리뷰가 없습니다.
            </p>
            <Button onClick={handleWriteReview} color="primary" size="md">
              첫 리뷰 작성하기
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {(showAllReviews
              ? reviews
              : reviews.slice(0, INITIAL_REVIEWS_LIMIT)
            ).map((review) => (
              <div
                key={review.id}
                className="border border-secondary rounded-lg p-6 bg-white"
              >
                <div className="flex items-start gap-4">
                  <ProfileIcon size="md" imageUrl={review.profileImageUrl} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-secondary">
                          {review.user}
                        </span>
                        <span className="text-sm text-gray-500">
                          {review.date}
                        </span>
                        {/* 별점 표시 */}
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(review.rating || 0)
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-sm text-gray-500 ml-1">
                            {review.rating || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-gray-800 pr-12 leading-relaxed break-words">
                        <div className="space-y-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {review.content}
                          </p>
                          {/* 리뷰 이미지들 */}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto">
                              {review.images.map((image, index) => (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`리뷰 이미지 ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0 border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(image, "_blank")}
                                  onError={(e) => {
                                    // 이미지 로드 실패 시 플레이스홀더로 대체
                                    e.currentTarget.src =
                                      "data:image/svg+xml;base64," +
                                      btoa(`
                                      <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="100%" height="100%" fill="#f3f4f6"/>
                                        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="Arial" font-size="12">이미지</text>
                                      </svg>
                                    `);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 점세개 버튼 - 본인 리뷰이거나 로그인한 사용자만 표시 */}
                      {(isMyReview(review) || isAuthenticated) && (
                        <div className="absolute top-0 right-0">
                          <Button
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                              toggleMenu(review.id, e)
                            }
                            color="gray"
                            size="sm"
                            className="!p-1 !min-w-0 !rounded-full !bg-transparent hover:!bg-gray-100 focus:!outline-none focus:!ring-0"
                          >
                            <svg
                              className="w-4 h-4 text-secondary"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </Button>

                          {/* 토글 메뉴 */}
                          {showMenuFor === review.id && (
                            <div className="absolute right-0 top-8 bg-white border border-secondary rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                              {/* 신고하기 - 본인 리뷰가 아닌 경우에만 표시 */}
                              {!isMyReview(review) && (
                                <button
                                  onClick={(
                                    e: React.MouseEvent<HTMLButtonElement>
                                  ) => {
                                    e.stopPropagation();
                                    handleReport(review.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  신고하기
                                </button>
                              )}
                              {/* 수정하기/삭제하기 - 본인 리뷰인 경우에만 표시 */}
                              {isMyReview(review) && (
                                <>
                                  <button
                                    onClick={(
                                      e: React.MouseEvent<HTMLButtonElement>
                                    ) => {
                                      e.stopPropagation();
                                      handleEdit(review.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    수정하기
                                  </button>
                                  <button
                                    onClick={(
                                      e: React.MouseEvent<HTMLButtonElement>
                                    ) => {
                                      e.stopPropagation();
                                      handleDelete(review.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                                  >
                                    삭제하기
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 리뷰가 있을 때만 버튼 표시 */}
        {reviews.length > 0 && (
          <div className="text-center mt-8 space-x-4">
            <Button onClick={handleWriteReview} color="primary" size="md">
              리뷰 작성하기
            </Button>
            {reviews.length > INITIAL_REVIEWS_LIMIT && (
              <Button
                onClick={() => setShowAllReviews(!showAllReviews)}
                color="gray"
                size="md"
                className="!bg-transparent !text-primary focus:!ring-0 !border-0 !shadow-none hover:!underline"
              >
                {showAllReviews ? "리뷰 접기" : "리뷰 더보기"}
              </Button>
            )}
          </div>
        )}

        {/* 신고 모달 */}
        {showReportModal && reportingReviewId && (
          <ReportReviewModal
            onClose={() => {
              setShowReportModal(false);
              setReportingReviewId(null);
              setReportingReviewAuthor("");
            }}
            reviewId={reportingReviewId}
            reviewAuthor={reportingReviewAuthor}
          />
        )}

        {/* 로그인 유도 모달 */}
        {showLoginPrompt && (
          <LoginPromptModal
            onClose={() => setShowLoginPrompt(false)}
            message="로그인 후 리뷰 작성을 할 수 있습니다."
          />
        )}
      </div>
    </div>
  );
}
