"use client";

import { Cafe } from "@/types/cafe";
import CafeCard from "./CafeCard";

interface CafeGridProps {
  cafes: Cafe[];
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

const CafeGrid: React.FC<CafeGridProps> = ({
  cafes,
  className = "",
  columns = 4,
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 2:
        return "grid-cols-2 md:grid-cols-2";
      case 3:
        return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case 5:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";
      default:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  if (cafes.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          검색 결과가 없습니다
        </h3>
        <p className="text-gray-600">다른 검색어나 필터를 시도해보세요.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${getGridCols()} gap-3 sm:gap-4 md:gap-5 lg:gap-6 ${className}`}>
      {cafes.map((cafe) => (
        <CafeCard key={cafe.cafe_id} cafe={cafe} />
      ))}
    </div>
  );
};

export default CafeGrid;
