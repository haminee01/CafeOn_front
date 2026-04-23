import { Cafe } from "@/types/cafe";
import {
  cafesWithLastOrder,
  lastOrderTimes,
  closedDaysMap,
  specialCafeInfo,
  specialReviewSets,
  similarCafesMap,
  defaultReviews,
  defaultImages,
  defaultTags,
  CafeHoursDetail,
  CafeReview,
} from "./cafeDetails";

// 카페별 영업시간 상세 정보 생성 함수
export function getHoursDetail(cafe: Cafe): CafeHoursDetail {
  const hasLastOrder = cafesWithLastOrder.includes(cafe.cafe_id);

  const lastOrderTime = hasLastOrder
    ? lastOrderTimes[cafe.open_hours] || "22:00"
    : null;
  const hoursDisplay =
    hasLastOrder && lastOrderTime
      ? `${cafe.open_hours} (라스트오더 ${lastOrderTime})`
      : cafe.open_hours;

  return {
    status: "영업 중",
    lastOrder: lastOrderTime,
    fullHours: hoursDisplay,
    breakTime: cafe.cafe_id === "33" ? "브레이크타임 없음" : "15:00 - 16:00",
    closedDays: getClosedDays(cafe.cafe_id),
  };
}

// 카페별 휴무일 정보
export function getClosedDays(cafeId: string): string {
  return closedDaysMap[cafeId] || "연중무휴";
}

// 카페별 특별 정보 가져오기
export function getSpecialInfo(cafeId: string) {
  return (
    specialCafeInfo[cafeId] || {
      slogan: "완벽한 커피 한 잔을 위해",
      phone: "02-1234-5678",
      subway: "가장 가까운 지하철역에서 도보 5분",
      tags: defaultTags,
    }
  );
}

// 카페별 리뷰 생성
export function getCafeReviews(cafe: Cafe): CafeReview[] {
  const cafeSpecificReviews = specialReviewSets[cafe.cafe_id] ?? [];
  const normalizedSpecific = cafeSpecificReviews.map((review, index) => ({
    ...review,
    id: index + 1,
  }));
  const normalizedDefault = defaultReviews.map((review, index) => ({
    ...review,
    id: normalizedSpecific.length + index + 1,
  }));

  return [...normalizedSpecific, ...normalizedDefault];
}

// 유사 카페 목록 가져오기
export function getSimilarCafes(cafeId: string, allCafes: Cafe[]): Cafe[] {
  const similarIds = similarCafesMap[cafeId];

  if (similarIds) {
    return allCafes.filter((cafe) => similarIds.includes(cafe.cafe_id));
  }

  return allCafes.filter((cafe) => cafe.cafe_id !== cafeId).slice(0, 4);
}

// 카페 상세 정보 생성
export function createCafeDetail(cafe: Cafe) {
  const specialInfo = getSpecialInfo(cafe.cafe_id);
  const hoursDetail = getHoursDetail(cafe);

  return {
    id: cafe.cafe_id,
    name: cafe.name,
    slogan: specialInfo.slogan,
    description: cafe.description,
    address: cafe.address,
    subway: specialInfo.subway,
    phone: specialInfo.phone,
    hours: hoursDetail.lastOrder ? `${cafe.open_hours}` : cafe.open_hours,
    hoursDetail,
    images: defaultImages,
    tags: specialInfo.tags,
    reviews: getCafeReviews(cafe),
  };
}
