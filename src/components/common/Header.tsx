"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import NotificationDropdown from "./NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadNotifications } from "@/api/chat";

interface HeaderProps {
  className?: string;
}

const Header = ({ className = "" }: HeaderProps) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleNotification = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const closeNotification = async () => {
    setIsNotificationOpen(false);
    // 드롭다운이 닫힐 때 알림 개수 다시 확인
    if (isAuthenticated) {
      try {
        const notifications = await getUnreadNotifications();
        const unreadNotifications = notifications.filter((n) => !n.read);
        setUnreadCount(unreadNotifications.length);
      } catch (error) {
        console.error("알림 개수 조회 실패:", error);
      }
    }
  };

  const { isAuthenticated, user, logout, isLoading } = useAuth();

  // 알림 개수 조회 및 실시간 업데이트
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchNotificationCount = async () => {
      try {
        const notifications = await getUnreadNotifications();
        const unreadNotifications = notifications.filter((n) => !n.read);
        setUnreadCount(unreadNotifications.length);
      } catch (error) {
        console.error("알림 개수 조회 실패:", error);
      }
    };

    // 초기 로드
    fetchNotificationCount();

    // 주기적으로 알림 개수 확인 (10초마다) - 더 빠른 업데이트
    const intervalId = setInterval(fetchNotificationCount, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  return (
    <header className={`header-component ${className}`}>
      <div className="content-container py-2.5 sm:py-3">
        <div className="flex justify-between items-center h-12 sm:h-14 md:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative">
              <button
                onClick={toggleNotification}
                className="text-text-primary font-normal text-sm sm:text-base hover:text-primary relative"
              >
                <IoNotificationsOutline className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />
                {/* 읽지 않은 알림이 있으면 빨간 점 표시 */}
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-warning rounded-full border-2 border-white"></span>
                )}
              </button>

              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={closeNotification}
                onNotificationCountChange={setUnreadCount}
              />
            </div>

            <Link
              href="/qna"
              className="text-text-primary font-medium text-sm sm:text-base hover:text-primary"
            >
              QnA
            </Link>
            <Link
              href="/community"
              className="text-text-primary font-medium text-sm sm:text-base hover:text-primary"
            >
              ToCafe
            </Link>
          </div>

          <div className="flex-shrink-0">
            <Link href="/">
              <h1 className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold tracking-tight text-primary cursor-pointer">
                CafeOn.
              </h1>
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6">
            {isLoading ? (
              // 초기 로딩 중일 때는 기본적으로 로그인 버튼 표시 (토큰 확인 중)
              <Link
                href="/login"
                className="text-text-primary font-medium text-xs sm:text-sm md:text-base hover:text-primary"
              >
                로그인
              </Link>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/mypage"
                  className="text-text-primary font-medium text-xs sm:text-sm md:text-base hover:text-primary"
                >
                  <span className="hidden sm:inline">마이페이지</span>
                  <span className="sm:hidden">마이</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-text-primary font-medium text-xs sm:text-sm md:text-base hover:text-primary"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-text-primary font-medium text-xs sm:text-sm md:text-base hover:text-primary"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-text-primary font-medium text-xs sm:text-sm md:text-base hover:text-primary"
                >
                  <span className="hidden sm:inline">회원가입</span>
                  <span className="sm:hidden">가입</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
