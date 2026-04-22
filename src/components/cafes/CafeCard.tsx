"use client";

import type { Cafe } from "@/types/cafe";
import { useRouter } from "next/navigation";

interface CafeCardProps {
  cafe: Cafe;
  className?: string;
}

const CafeCard: React.FC<CafeCardProps> = ({ cafe, className = "" }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/cafes/${cafe.cafe_id}`);
  };

  return (
    <div
      className={`cursor-pointer flex flex-col w-full max-w-full mx-auto ${className}`}
      onClick={handleCardClick}
    >
      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden rounded-lg">
        {/* 플레이스홀더 (기본 배경) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-4xl">☕</div>
        </div>

        {/* 카페 이미지 */}
        {(() => {
          const imageUrl =
            (cafe as any).photoUrl ||
            (cafe as any).photo_url ||
            ((cafe as any).images &&
            Array.isArray((cafe as any).images) &&
            (cafe as any).images.length > 0
              ? (cafe as any).images[0]
              : null);

          if (imageUrl) {
            return (
              <img
                src={imageUrl}
                alt={cafe.name || "카페 이미지"}
                className="relative w-full h-full object-cover z-10"
                onError={(e) => {
                  // 이미지 로드 실패 시 숨김 (플레이스홀더가 보임)
                  e.currentTarget.style.display = "none";
                }}
              />
            );
          }
        })()}
      </div>

      <div className="p-2.5 sm:p-3 md:p-4 flex flex-col items-center text-center">
        <h3 className="text-sm sm:text-base md:text-[17px] font-normal text-gray-900 mb-1.5 sm:mb-2 line-clamp-1 w-full leading-snug">
          {cafe.name}
        </h3>

        {/* 태그가 있으면 태그 표시, 없으면 주소 표시 */}
        {cafe.tags && Array.isArray(cafe.tags) && cafe.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center items-center min-h-[22px] sm:min-h-[24px]">
            {cafe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-1.5 sm:px-2 py-0.5 bg-[#6E4213] text-white rounded-full text-[10px] sm:text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {cafe.tags.length > 3 && (
              <span className="text-[10px] sm:text-xs text-gray-400">
                +{cafe.tags.length - 3}
              </span>
            )}
          </div>
        ) : (
          cafe.address && (
            <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 min-h-[20px] sm:min-h-[24px] text-center">
              {cafe.address}
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default CafeCard;
