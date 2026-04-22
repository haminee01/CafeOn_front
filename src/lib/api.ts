import apiClient from "./axios";
import { normalizeError as normalizeErrorUtil } from "@/utils/errorHandler";
import * as mockApi from "@/lib/mockApi";
import {
  demoGetMyChatRooms,
  demoMarkAsRead,
  demoHistory,
} from "@/lib/mockChatApi";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// API 에러를 표준화하여 throw (source 자동 추가)
function normalizeError(error: unknown, context?: Record<string, unknown>) {
  return normalizeErrorUtil(error, { source: "api.ts", ...context });
}

type NumericLike = number | string | { [key: string]: unknown };

interface CafeApiResponse {
  cafeId?: string | number;
  id?: string | number;
  cafe_id?: string | number;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  openHours?: string;
  open_hours?: string;
  avgRating?: NumericLike | null;
  avg_rating?: NumericLike | null;
  createdAt?: string;
  created_at?: string;
  description?: string;
  reviewsSummary?: string;
  tags?: string[];
  photoUrl?: string | null;
  photo_url?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  images?: string[];
}

export interface CafeSummary {
  cafe_id: string;
  cafeId?: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  open_hours: string;
  avg_rating: number;
  avgRating: number;
  created_at: string;
  description: string;
  tags: string[];
  photoUrl: string | null;
  images: string[];
}

// ==================== Auth API ====================

// 회원가입
export async function signup(userData: {
  name: string;
  email: string;
  password: string;
  nickname: string;
  phone: string;
}) {
  if (DEMO_MODE) {
    return { message: "회원가입이 완료되었습니다.", data: { userId: `demo-${Date.now()}` } };
  }
  try {
    const response = await apiClient.post("/api/auth/signup", userData);
    return response.data;
  } catch (error) {
    throw normalizeError(error, {
      action: "signup",
      userData: { email: userData.email },
    });
  }
}

// 로그인
export async function login(credentials: { email: string; password: string }) {
  if (DEMO_MODE) {
    return {
      message: "로그인 성공",
      data: {
        token: `demo-token-${Date.now()}`,
        refreshToken: `demo-refresh-${Date.now()}`,
        user: {
          id: "demo-user",
          email: credentials.email,
          nickname: credentials.email.split("@")[0] || "사용자",
        },
      },
    };
  }
  try {
    const response = await apiClient.post("/api/auth/login", credentials);
    return response.data;
  } catch (error) {
    throw normalizeError(error, {
      action: "login",
      userData: { email: credentials.email },
    });
  }
}

// 임시 비밀번호 발급
export async function requestPasswordReset(email: string) {
  try {
    const response = await apiClient.post("/api/auth/password/reset", {
      email,
    });
    return (
      response.data || { message: "임시 비밀번호가 이메일로 발송되었습니다." }
    );
  } catch (error) {
    throw normalizeError(error, { action: "requestPasswordReset", email });
  }
}

// ==================== Cafe API ====================

// 전체 카페 목록 조회 (관리자용)
export async function getAllCafes() {
  try {
    const response = await apiClient.get("/api/cafes/search");
    return response.data;
  } catch (error) {
    throw normalizeError(error, { action: "getAllCafes" });
  }
}

// 카페 검색
export async function searchCafes(query?: string, tags?: string | string[]) {
  if (DEMO_MODE) {
    return mockApi.searchCafesMock(query, tags).map(convertCafeResponseToCafe);
  }
  try {
    // 백엔드에 query와 tags 파라미터 전달 (명세서에 따라 tags 복수형 사용)
    const params: Record<string, string | string[]> = {};
    if (query) params.query = query;
    if (tags) {
      // 배열이면 각 태그를 개별 파라미터로 전달 (예: tags=분위기&tags=포토스팟)
      // 단일 문자열이면 그대로 전달
      params.tags = Array.isArray(tags) ? tags : tags;
    }

    const response = await apiClient.get("/api/cafes/search", {
      params,
    });

    const cafes = response.data;

    // 배열인지 확인하고 변환
    if (Array.isArray(cafes)) {
      return cafes.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, { action: "searchCafes", query, tags });
  }
}

// 카페 상세 정보 조회
export async function getCafeDetail(cafeId: string) {
  if (DEMO_MODE) {
    return convertCafeResponseToCafe(mockApi.getCafeById(cafeId));
  }
  try {
    const response = await apiClient.get(`/api/cafes/${cafeId}`);
    return response.data;
  } catch (error) {
    throw normalizeError(error, { action: "getCafeDetail", cafeId });
  }
}

// 근처 카페 조회 (지도 페이지용)
export async function getNearbyCafes(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}) {
  if (DEMO_MODE) {
    return mockApi
      .getNearbyCafesMock(params.latitude, params.longitude, params.radius)
      .map(convertCafeResponseToCafe);
  }
  try {
    // 근처 카페 조회는 시간이 걸릴 수 있으므로 타임아웃을 더 길게 설정
    const response = await apiClient.get("/api/cafes/nearby", {
      params: {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 1000,
      },
      timeout: 30000, // 30초로 증가 (Kakao API 호출 + DB 조회 시간 고려)
    });

    // 백엔드 응답 형식에 따라 처리
    // nearby API는 { cafes: [...] } 형태일 수도 있음
    const cafesData =
      response.data?.cafes || response.data?.data || response.data;

    // 배열인지 확인하고 변환
    if (Array.isArray(cafesData)) {
      return cafesData.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, {
      action: "getNearbyCafes",
      params,
    });
  }
}

// 백엔드 카페 응답을 프론트엔드 Cafe 타입으로 변환
function convertCafeResponseToCafe(cafe: CafeApiResponse): CafeSummary {
  // 평점 처리: avgRating이 우선, 없으면 avg_rating 사용
  let avgRating = null;

  // avgRating 필드 확인 (백엔드에서 보내는 필드)
  if (
    cafe.avgRating != null &&
    cafe.avgRating !== undefined &&
    cafe.avgRating !== ""
  ) {
    if (typeof cafe.avgRating === "number") {
      avgRating = cafe.avgRating;
    } else if (typeof cafe.avgRating === "string") {
      const parsed = parseFloat(cafe.avgRating);
      avgRating = !isNaN(parsed) ? parsed : null;
    } else {
      // 객체인 경우 (BigDecimal 직렬화 형태일 수 있음)
      const stringValue = String(cafe.avgRating);
      const parsed = parseFloat(stringValue);
      avgRating = !isNaN(parsed) ? parsed : null;
    }
  }

  // avg_rating 필드 확인 (fallback)
  if (
    avgRating == null &&
    cafe.avg_rating != null &&
    cafe.avg_rating !== undefined &&
    cafe.avg_rating !== ""
  ) {
    if (typeof cafe.avg_rating === "number") {
      avgRating = cafe.avg_rating;
    } else {
      const parsed = parseFloat(String(cafe.avg_rating));
      avgRating = !isNaN(parsed) ? parsed : null;
    }
  }

  // 최종적으로 null이면 0으로 설정 (백엔드 기본값과 동일)
  const finalRating = avgRating != null ? avgRating : 0;

  return {
    cafe_id: String(cafe.cafeId || cafe.id || cafe.cafe_id || ""),
    cafeId: cafe.cafeId || cafe.id || cafe.cafe_id,
    name: cafe.name || "",
    address: cafe.address || "",
    latitude: cafe.latitude || 0,
    longitude: cafe.longitude || 0,
    open_hours: cafe.openHours || cafe.open_hours || "",
    avg_rating: finalRating,
    avgRating: finalRating, // 원본 필드도 함께 저장
    created_at: cafe.createdAt || cafe.created_at || "",
    description: cafe.description || cafe.reviewsSummary || "",
    tags: Array.isArray(cafe.tags) ? cafe.tags : [],
    photoUrl:
      cafe.photoUrl ||
      cafe.photo_url ||
      cafe.imageUrl ||
      cafe.image_url ||
      null,
    images: cafe.images || (cafe.photoUrl ? [cafe.photoUrl] : []) || [],
  };
}

// 랜덤 카페 10개 조회
export async function getRandomCafes() {
  if (DEMO_MODE) {
    return mockApi.getRandomCafesMock(10).map(convertCafeResponseToCafe);
  }
  try {
    const response = await apiClient.get("/api/cafes/random10");

    // 백엔드 응답 형식에 따라 처리
    const data = response.data?.data || response.data;

    // 디버깅: 첫 번째 카페의 원본 응답 확인
    if (
      process.env.NODE_ENV === "development" &&
      Array.isArray(data) &&
      data.length > 0
    ) {
    }

    // 배열인지 확인하고 변환
    if (Array.isArray(data)) {
      return data.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, { action: "getRandomCafes" });
  }
}

// 요즘 뜨고 있는 카페 top10 조회
export async function getHotCafes() {
  if (DEMO_MODE) {
    return mockApi.getHotCafesMock(10).map(convertCafeResponseToCafe);
  }
  try {
    const response = await apiClient.get("/api/cafes/hot10");

    // 백엔드 응답 형식에 따라 처리
    const data = response.data?.data || response.data;

    // 디버깅: 첫 번째 카페의 원본 응답 확인
    if (
      process.env.NODE_ENV === "development" &&
      Array.isArray(data) &&
      data.length > 0
    ) {
    }

    // 배열인지 확인하고 변환
    if (Array.isArray(data)) {
      return data.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, { action: "getHotCafes" });
  }
}

// 찜 많은 카페 top10 조회
export async function getWishlistTopCafes() {
  if (DEMO_MODE) {
    return mockApi.getWishlistTopCafesMock(10).map(convertCafeResponseToCafe);
  }
  try {
    const response = await apiClient.get("/api/cafes/wish10");

    // 백엔드 응답 형식에 따라 처리
    const data = response.data?.data || response.data;

    // 배열인지 확인하고 변환
    if (Array.isArray(data)) {
      return data.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, { action: "getWishlistTopCafes" });
  }
}

// 관련 카페 10개 조회
// 백엔드 API가 아직 구현되지 않은 경우를 대비한 임시 처리
export async function getRelatedCafes(cafeId: string) {
  if (DEMO_MODE) {
    return mockApi.getRelatedCafesMock(cafeId).map(convertCafeResponseToCafe);
  }
  try {
    const response = await apiClient.get("/api/cafes/related10", {
      params: {
        id: cafeId,
      },
    });

    // 백엔드 응답 형식에 따라 처리
    const cafesData =
      response.data?.cafes || response.data?.data || response.data;

    // 배열인지 확인하고 변환
    if (Array.isArray(cafesData)) {
      return cafesData.map(convertCafeResponseToCafe);
    }
    return [];
  } catch (error) {
    throw normalizeError(error, {
      action: "getRelatedCafes",
      cafeId,
    });
  }
}

// ==================== MyPage API ====================
// ==================== Review API ====================

// 카페별 리뷰 목록 조회
export async function getCafeReviews(cafeId: string) {
  if (DEMO_MODE) {
    return mockApi.getCafeReviewsMock(cafeId);
  }
  try {
    const response = await apiClient.get(`/api/cafes/${cafeId}/reviews`);
    return response.data || { reviews: [], count: 0 };
  } catch (error) {
    console.error("카페 리뷰 목록 조회 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 목록 조회 실패");
  }
}

// 리뷰 작성
export async function createReview(
  cafeId: string,
  reviewData: {
    content: string;
    rating: number;
    images?: File[];
  },
) {
  try {
    const formData = new FormData();

    // 리뷰 데이터를 JSON으로 변환하여 추가
    formData.append(
      "review",
      JSON.stringify({
        content: reviewData.content,
        rating: reviewData.rating,
      }),
    );

    // 이미지 파일들 추가
    if (reviewData.images && reviewData.images.length > 0) {
      reviewData.images.forEach((image) => {
        formData.append("images", image);
      });
    }

    const response = await apiClient.post(
      `/api/cafes/${cafeId}/reviews`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("리뷰 작성 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 작성 실패");
  }
}

// 리뷰 수정
export async function updateReview(
  reviewId: string,
  reviewData: {
    content: string;
    rating: number;
    images?: File[];
  },
) {
  try {
    const formData = new FormData();

    // 리뷰 데이터를 JSON으로 변환하여 추가
    formData.append(
      "review",
      JSON.stringify({
        content: reviewData.content,
        rating: reviewData.rating,
      }),
    );

    // 이미지 파일들 추가
    if (reviewData.images && reviewData.images.length > 0) {
      reviewData.images.forEach((image) => {
        formData.append("images", image);
      });
    }

    const response = await apiClient.put(`/api/reviews/${reviewId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("리뷰 수정 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 수정 실패");
  }
}

// 리뷰 삭제
export async function deleteReview(reviewId: string) {
  if (DEMO_MODE) {
    return mockApi.deleteReviewMock(reviewId);
  }
  try {
    const response = await apiClient.delete(`/api/reviews/${reviewId}`);
    return response.data;
  } catch (error) {
    console.error("리뷰 삭제 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 삭제 실패");
  }
}

// 리뷰 신고 상태 확인
export async function checkReviewReportStatus(reviewId: string) {
  try {
    const response = await apiClient.get(
      `/api/reviews/${reviewId}/reports/status`,
    );
    return response.data;
  } catch (error) {
    console.error("리뷰 신고 상태 확인 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 신고 상태 확인 실패");
  }
}

// 리뷰 신고
export async function reportReview(reviewId: string, content: string) {
  try {
    const response = await apiClient.post(`/api/reviews/${reviewId}/reports`, {
      content,
    });
    return response.data;
  } catch (error) {
    console.error("리뷰 신고 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "리뷰 신고 실패");
  }
}

// 위시리스트 조회
export async function getWishlist(params?: {
  page?: number;
  size?: number;
  category?: string;
  sort?: string;
}) {
  if (DEMO_MODE) {
    return { data: mockApi.getWishlistMock(params) };
  }
  try {
    // 백엔드가 category를 필수로 요구하므로, category가 없으면 빈 결과 반환
    if (!params?.category) {
      return {
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: params?.page || 0,
          size: params?.size || 20,
        },
      };
    }

    const response = await apiClient.get("/api/my/wishlist", { params });
    return response.data;
  } catch (error) {
    throw normalizeError(error, {
      action: "getWishlist",
      params,
    });
  }
}

// 특정 카페의 위시리스트 카테고리 조회
export async function getWishlistCategories(cafeId: string) {
  if (DEMO_MODE) {
    return mockApi.getWishlistCategoriesMock(cafeId);
  }
  try {
    const response = await apiClient.get(`/api/my/wishlist/${cafeId}`);
    return response.data;
  } catch (error) {
    throw normalizeError(error, {
      action: "getWishlistCategories",
      cafeId,
    });
  }
}

// 위시리스트 추가/제거 (토글)
export async function toggleWishlist(cafeId: string, category: string) {
  if (DEMO_MODE) {
    return mockApi.toggleWishlistMock(cafeId, category);
  }
  try {
    const response = await apiClient.post(
      `/api/my/wishlist/${cafeId}?category=${category}`,
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, {
      action: "toggleWishlist",
      cafeId,
      category,
    });
  }
}

// ==================== Admin API ====================

// 관리자 회원 목록 조회
export async function getAdminMembers(params?: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
}) {
  try {
    const response = await apiClient.get("/api/admin/users", { params });
    return response.data;
  } catch (error) {
    console.error("Admin 회원 목록 API 호출 실패:", error);
    const { statusCode, message } = normalizeError(error);

    if (statusCode === 403) {
      throw new Error("관리자 권한이 필요합니다.");
    }

    throw new Error(
      message || `회원 목록 조회 실패 (${statusCode || "unknown"})`,
    );
  }
}

// 관리자 회원 상세 조회
export async function getAdminMemberDetail(userId: string) {
  try {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Admin 회원 상세 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "회원 상세 조회 실패");
  }
}

// 관리자 페널티 부여
export async function addAdminPenalty(
  userId: string,
  data: {
    reason: string;
    reasonCode?: string;
  },
) {
  try {
    const response = await apiClient.post(
      `/api/admin/users/${userId}/penalty`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Admin 페널티 부여 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "페널티 부여 실패");
  }
}

// 관리자 회원 정지
export async function suspendAdminUser(
  userId: string,
  data: {
    duration: string;
    reason: string;
    reasonCode?: string;
  },
) {
  try {
    const response = await apiClient.post(
      `/api/admin/users/${userId}/suspend`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Admin 회원 정지 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "회원 정지 실패");
  }
}

// 회원 패널티 내역 조회
export async function getUserPenalties(userId: string) {
  try {
    const response = await apiClient.get(
      `/api/admin/users/${userId}/penalties`,
    );
    return response.data;
  } catch (error) {
    console.error("Admin 회원 패널티 조회 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "패널티 조회 실패");
  }
}

// ==================== Admin Reports API ====================

// 관리자 신고 목록 조회
export async function getAdminReports(status?: string) {
  try {
    const params = status ? { status } : {};
    const response = await apiClient.get("/api/admin/reports", { params });
    return response.data;
  } catch (error) {
    console.error("Admin 신고 목록 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "신고 목록 조회 실패");
  }
}

// 관리자 신고 상세 조회
export async function getAdminReportDetail(id: number) {
  try {
    const response = await apiClient.get(`/api/admin/reports/${id}`);
    return response.data;
  } catch (error) {
    console.error("Admin 신고 상세 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "신고 상세 조회 실패");
  }
}

// 관리자 신고 처리
export async function updateAdminReport(id: number, data: { status: string }) {
  try {
    const response = await apiClient.put(`/api/admin/reports/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Admin 신고 처리 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "신고 처리 실패");
  }
}

// ==================== User API ====================

// 회원 정보 조회
export async function getUserProfile() {
  if (DEMO_MODE) {
    return { data: mockApi.getProfileMock() };
  }
  try {
    const response = await apiClient.get("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("회원 정보 조회 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "회원 정보 조회 실패");
  }
}

// 회원 정보 수정 (닉네임)
export async function updateUserProfile(nickname: string) {
  if (DEMO_MODE) {
    return { data: mockApi.updateProfileMock(nickname) };
  }
  try {
    const response = await apiClient.put("/api/users/me", { nickname });
    return response.data;
  } catch (error) {
    console.error("회원 정보 수정 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "회원 정보 수정 실패");
  }
}

// 프로필 이미지 변경
export async function updateProfileImage(file: File) {
  if (DEMO_MODE) {
    const imageUrl = URL.createObjectURL(file);
    return {
      data: {
        ...mockApi.getProfileMock(),
        profileImageUrl: imageUrl,
      },
    };
  }
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.put(
      "/api/users/me/profile-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("프로필 이미지 변경 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "프로필 이미지 변경 실패");
  }
}

// 회원 탈퇴
export async function deleteUser() {
  if (DEMO_MODE) {
    return { message: "회원 탈퇴가 완료되었습니다." };
  }
  try {
    const response = await apiClient.delete("/api/users/me");
    return response.data;
  } catch (error) {
    console.error("회원 탈퇴 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "회원 탈퇴 실패");
  }
}

// 비밀번호 변경
export async function changePassword(passwordData: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  if (DEMO_MODE) {
    return { message: "비밀번호가 변경되었습니다." };
  }
  try {
    const response = await apiClient.put(
      "/api/users/me/password",
      passwordData,
    );
    return response.data;
  } catch (error) {
    console.error("비밀번호 변경 실패:", error);
    const { statusCode, message } = normalizeError(error);

    // 상태 코드별 에러 메시지
    if (statusCode === 400) {
      throw new Error("현재 비밀번호가 일치하지 않습니다.");
    } else if (statusCode === 401) {
      throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
    } else if (statusCode === 403) {
      throw new Error("접근 권한이 없습니다.");
    }

    throw new Error(message || "비밀번호 변경에 실패했습니다.");
  }
}

// ==================== Admin Inquiries API ====================

// 관리자 문의 목록 조회
export async function getAdminInquiries(params?: {
  page?: number;
  size?: number;
  keyword?: string;
  status?: string;
}) {
  try {
    const response = await apiClient.get("/api/admin/inquiries", { params });
    return response.data;
  } catch (error) {
    console.error("Admin 문의 목록 API 호출 실패:", error);
    const { statusCode, message } = normalizeError(error);

    if (statusCode === 403) {
      throw new Error("관리자 권한이 필요합니다.");
    }

    throw new Error(
      message || `문의 목록 조회 실패 (${statusCode || "unknown"})`,
    );
  }
}

// 관리자 문의 상세 조회
export async function getAdminInquiryDetail(id: number) {
  try {
    const response = await apiClient.get(`/api/admin/inquiries/${id}`);
    return response.data;
  } catch (error) {
    console.error("Admin 문의 상세 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "문의 상세 조회 실패");
  }
}

// 관리자 답변 목록 조회
export async function getAdminInquiryAnswers(inquiryId: number) {
  try {
    const response = await apiClient.get(
      `/api/admin/inquiries/${inquiryId}/answers`,
    );
    return response.data;
  } catch (error) {
    console.error("Admin 답변 목록 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "답변 목록 조회 실패");
  }
}

// 관리자 답변 작성
export async function createAdminInquiryAnswer(
  inquiryId: number,
  content: string,
) {
  try {
    const response = await apiClient.post(
      `/api/admin/inquiries/${inquiryId}/answers`,
      { content },
    );
    return response.data;
  } catch (error) {
    console.error("Admin 답변 작성 API 호출 실패:", error);
    const { message } = normalizeError(error);
    throw new Error(message || "답변 작성 실패");
  }
}

// ==================== Wishlist API ====================

// 위시리스트 타입 정의
export interface WishlistResponse {
  data: {
    content: Array<{
      id: number;
      cafeId: number;
      name: string;
      category: string;
    }>;
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  };
}

// 위시리스트 제거 (DELETE)
export async function deleteWishlist(cafeId: number, category: string) {
  if (DEMO_MODE) {
    return mockApi.deleteWishlistMock(cafeId, category);
  }
  try {
    const response = await apiClient.delete(`/api/my/wishlist/${cafeId}`, {
      params: { category },
    });
    return response.data;
  } catch (error) {
    console.error("위시리스트 제거 API 호출 실패:", error);
    throw normalizeError(error, { action: "deleteWishlist", cafeId, category });
  }
}

// ==================== Chat API ====================

// 내 채팅방 목록 조회
export async function getMyChatRooms() {
  if (DEMO_MODE) {
    return demoGetMyChatRooms();
  }
  try {
    const response = await apiClient.get("/api/my/chat/rooms");
    return response.data;
  } catch (error) {
    console.error("내 채팅방 목록 API 호출 실패:", error);
    throw normalizeError(error, { action: "getMyChatRooms" });
  }
}

// 채팅 읽음 처리
export async function markChatAsRead(roomId: string, lastReadChatId: string) {
  if (DEMO_MODE) {
    return demoMarkAsRead(roomId, Number(lastReadChatId || 0));
  }
  try {
    const response = await apiClient.post(
      `/api/chat/rooms/${roomId}/members/me/read-latest`,
      {
        lastReadChatId: lastReadChatId,
      },
    );
    return response.data;
  } catch (error) {
    console.error("채팅 읽음 처리 API 호출 실패:", error);
    throw normalizeError(error, {
      action: "markChatAsRead",
      roomId,
      lastReadChatId,
    });
  }
}

// 사용자의 읽지 않은 채팅 목록 조회
export async function getNotificationsUnread() {
  if (DEMO_MODE) {
    const rooms = demoGetMyChatRooms().data.content;
    return rooms
      .filter((room) => room.unreadCount > 0)
      .map((room) => ({
        notificationId: `demo-room-${room.roomId}`,
        roomId: String(room.roomId),
        chatId: 0,
        title: "새 채팅 메시지",
        preview: room.lastMessage,
        deeplink: `/mypage/chats?room=${room.roomId}`,
        read: false,
        createdAt: room.lastMessageAt,
      }));
  }
  try {
    const response = await apiClient.get("/api/notifications/unread");
    return response.data;
  } catch (error) {
    console.error("읽지 않은 알림 조회 API 호출 실패:", error);
    throw normalizeError(error, { action: "getNotificationsUnread" });
  }
}

// 채팅방 메시지 목록 조회 (othersUnreadUsers 포함)
export async function getChatMessagesWithUnreadCount(roomId: string) {
  if (DEMO_MODE) {
    if (!roomId || roomId === "undefined" || roomId === "null") {
      throw new Error("유효하지 않은 roomId입니다.");
    }
    return { data: { content: demoHistory(roomId, undefined, 200).data.content } };
  }
  try {
    if (!roomId || roomId === "undefined" || roomId === "null") {
      throw new Error("유효하지 않은 roomId입니다.");
    }

    const response = await apiClient.get(`/api/chat/rooms/${roomId}/messages`);
    return response.data;
  } catch (error) {
    console.error("채팅 메시지 조회 API 호출 실패:", error);
    throw normalizeError(error, {
      action: "getChatMessagesWithUnreadCount",
      roomId,
    });
  }
}

// 채팅방 이미지 전송
export interface SendChatImageResponse {
  message: string;
  chatId: number;
  roomId: number;
  senderId: string;
  content: string;
  createdAt: string;
  timeLabel: string;
  senderNickname: string;
  messageType: string;
  othersUnreadUsers: number | string[];
  images: Array<{
    imageId: number;
    originalFileName: string;
    imageUrl: string;
  }>;
}

export async function sendChatImage(
  roomId: string | number,
  files: File[],
  caption?: string,
): Promise<SendChatImageResponse> {
  try {
    if (!files || files.length === 0) {
      throw new Error("전송할 파일을 선택해주세요.");
    }

    // FormData 생성
    const formData = new FormData();

    // 파일 추가 (key: 'files')
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    // 캡션 추가 (key: 'caption', 선택사항)
    if (caption) {
      formData.append("caption", caption);
    }

    const response = await apiClient.post(
      `/api/rooms/${roomId}/messages/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("채팅 이미지 전송 API 호출 실패:", error);
    throw normalizeError(error, { action: "sendChatImage", roomId });
  }
}

// ==================== Review API ====================

// 리뷰 이미지 타입
export interface ReviewImage {
  imageId: number;
  originalFileName: string;
  imageUrl: string;
}

// 내가 작성한 리뷰 타입
export interface MyReview {
  reviewId: number;
  rating: number;
  content: string;
  createdAt: string;
  reported: boolean;
  cafeId: number;
  cafeName: string;
  reviewerId: string;
  reviewerNickname: string;
  reviewerProfileImageUrl: string | null;
  images: ReviewImage[];
}

// 내가 작성한 리뷰 목록 조회 응답 타입
export interface MyReviewsResponse {
  message: string;
  data: {
    content: MyReview[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        empty: boolean;
        unsorted: boolean;
        sorted: boolean;
      };
      offset: number;
      unpaged: boolean;
      paged: boolean;
    };
    totalElements: number;
    last: boolean;
    totalPages: number;
    size: number;
    number: number;
    sort: {
      empty: boolean;
      unsorted: boolean;
      sorted: boolean;
    };
    first: boolean;
    numberOfElements: number;
    empty: boolean;
  };
}

// 리뷰 수정 요청 타입
export interface UpdateReviewRequest {
  content: string;
  rating: number;
  images?: number[]; // 이미지 ID 배열 (기존 이미지 유지 시)
}

// 리뷰 수정 응답 타입
export interface UpdateReviewResponse {
  message: string;
  data: {
    reviewId: number;
    rating: number;
    content: string;
    createdAt: string;
    reported: boolean;
    cafeId: number;
    cafeName: string;
    reviewerId: string;
    reviewerNickname: string;
    reviewerProfileImageUrl: string | null;
    images: ReviewImage[];
  };
}

// 내가 작성한 리뷰 목록 조회
export async function getMyReviews(params?: {
  page?: number;
  size?: number;
}): Promise<MyReviewsResponse> {
  if (DEMO_MODE) {
    return mockApi.getMyReviewsMock(params) as MyReviewsResponse;
  }
  try {
    const response = await apiClient.get("/api/my/reviews", {
      params: {
        page: params?.page,
        size: params?.size,
      },
    });
    return response.data;
  } catch (error) {
    console.error("내가 작성한 리뷰 조회 API 호출 실패:", error);
    throw normalizeError(error, { action: "getMyReviews", params });
  }
}
