"use client";

import React, { useState, useRef, useEffect } from "react";
import { sendChatImage } from "@/lib/api";

interface ChatMessageInputProps extends React.HTMLAttributes<HTMLFormElement> {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  roomId?: string | number;
}

const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  onSendMessage,
  className,
  disabled = false,
  roomId,
}) => {
  const getIsMobileViewport = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  };

  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isImageFormOpen, setIsImageFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    getIsMobileViewport()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(getIsMobileViewport());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImages(files);

    // 이미지 미리보기 생성
    const previews: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          previews.push(reader.result as string);
          if (previews.length === files.length) {
            setImagePreviews(previews);
            setIsImageFormOpen(true);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);

    if (newImages.length === 0) {
      setIsImageFormOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendImage = async () => {
    if (!roomId) {
      alert("채팅방 정보가 없습니다.");
      return;
    }

    if (selectedImages.length === 0) {
      alert("전송할 이미지를 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      await sendChatImage(roomId, selectedImages, input.trim() || undefined);

      // 성공 후 초기화
      setSelectedImages([]);
      setImagePreviews([]);
      setIsImageFormOpen(false);
      setInput("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("이미지 전송 실패:", error);
      alert(
        error instanceof Error ? error.message : "이미지 전송에 실패했습니다."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseImageForm = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    setIsImageFormOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`p-3 sm:p-4 border-t border-gray-200 bg-white flex items-center shadow-md ${className}`}
      >
        {/* 이미지 버튼 */}
        <button
          type="button"
          onClick={handleImageButtonClick}
          disabled={disabled}
          className="p-2 sm:p-3 rounded-xl transition duration-150 shadow-sm mr-2 text-gray-600 hover:text-[#6E4213] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="이미지 첨부"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-6 h-6"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={disabled}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#6E4213] transition duration-150 mr-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          autoFocus={!isMobileViewport}
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className={`px-4 py-2 sm:p-3 rounded-xl transition duration-150 shadow-sm
            ${
              input.trim() && !disabled
                ? "bg-[#6E4213] text-white hover:bg-[#8d5e33]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
          </svg>
        </button>
      </form>

      {/* 이미지 전송 폼 */}
      {isImageFormOpen && (
        <div className="p-4 border-t border-gray-200 bg-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              이미지 전송 ({selectedImages.length}개)
            </h3>
            <button
              type="button"
              onClick={handleCloseImageForm}
              className="text-gray-500 hover:text-gray-700"
              aria-label="이미지 폼 닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 이미지 미리보기 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`미리보기 ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  aria-label="이미지 제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* 캡션 입력 */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="캡션을 입력하세요 (선택사항)"
            disabled={disabled || isUploading}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6E4213] mb-3 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />

          {/* 전송 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSendImage}
              disabled={disabled || isUploading || selectedImages.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-150 ${
                !disabled && !isUploading && selectedImages.length > 0
                  ? "bg-[#6E4213] text-white hover:bg-[#8d5e33]"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isUploading ? "전송 중..." : "이미지 전송"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatMessageInput;
