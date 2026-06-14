"use client";

import { useState } from "react";
import { addToWishlist, deleteWishlist } from "@/lib/api";
import LoginPromptModal from "./LoginPromptModal";
import { useToastContext } from "@/components/common/ToastProvider";

interface WishlistModalProps {
  onClose: () => void;
  cafeId: string;
  cafeName: string;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const WISHLIST_CATEGORIES = [
  { value: "HIDEOUT", label: "나만의 아지트", icon: "🏠" },
  { value: "WORK", label: "작업하기 좋은", icon: "💻" },
  { value: "ATMOSPHERE", label: "분위기 좋은", icon: "✨" },
  { value: "TASTE", label: "커피·디저트 맛집", icon: "☕" },
  { value: "PLANNED", label: "방문 예정", icon: "📅" },
] as const;

export default function WishlistModal({
  onClose,
  cafeId,
  cafeName,
  selectedCategories,
  onCategoriesChange,
}: WishlistModalProps) {
  const { showToast } = useToastContext();
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCategoryToggle = async (category: string) => {
    if (loadingCategory) return;

    const normalizedCategory = category.toUpperCase();
    const willAdd = !selectedCategories.includes(normalizedCategory);
    const previousCategories = [...selectedCategories];

    const optimisticCategories = willAdd
      ? [...selectedCategories, normalizedCategory]
      : selectedCategories.filter((item) => item !== normalizedCategory);

    onCategoriesChange(optimisticCategories);
    setLoadingCategory(normalizedCategory);

    try {
      if (willAdd) {
        await addToWishlist(cafeId, normalizedCategory);
        showToast("위시리스트에 추가되었습니다!", "success");
      } else {
        await deleteWishlist(Number(cafeId), normalizedCategory);
        showToast("위시리스트에서 제거되었습니다.", "info");
      }
    } catch (error: any) {
      onCategoriesChange(previousCategories);
      console.error("위시리스트 변경 실패:", error);
      if (error?.response?.status === 403) {
        setShowLoginPrompt(true);
      } else {
        showToast(
          "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
          "error"
        );
      }
    } finally {
      setLoadingCategory(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {cafeName} 위시리스트
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {WISHLIST_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.value);
            const isCurrentlyLoading = loadingCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() => handleCategoryToggle(category.value)}
                disabled={loadingCategory !== null}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                } ${
                  loadingCategory !== null && !isCurrentlyLoading
                    ? "opacity-60"
                    : ""
                } ${
                  isCurrentlyLoading
                    ? "opacity-80 cursor-wait"
                    : "cursor-pointer"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium">{category.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {isCurrentlyLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            완료
          </button>
        </div>
      </div>

      {showLoginPrompt && (
        <LoginPromptModal
          onClose={() => setShowLoginPrompt(false)}
          message="로그인 후 위시리스트 기능을 이용할 수 있습니다."
        />
      )}
    </div>
  );
}
