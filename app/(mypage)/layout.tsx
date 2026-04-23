"use client";

import MypageSidebar from "../../src/components/mypage/MypageSidebar";
import Header from "../../src/components/common/Header";
import Footer from "../../src/components/common/Footer";

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 로직(로그인 여부 확인) 추가

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="content-container flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-[calc(100vh-200px)] py-6 sm:py-8 lg:py-10">
        {/* 1. 사이드바 영역 */}
        <MypageSidebar />

        {/* 2. 메인 컨텐츠 영역 */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 app-card">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
