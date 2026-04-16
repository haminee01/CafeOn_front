"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/common/Button";
import { useEscapeKey } from "../../../src/hooks/useEscapeKey";
import Header from "@/components/common/Header";
import { useToastContext } from "@/components/common/ToastProvider";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { showToast } = useToastContext();
  const { login: authLogin } = useAuthContext();

  // ESC 키 이벤트 처리
  useEscapeKey(() => {
    if (showPasswordReset) {
      setShowPasswordReset(false);
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 로그인 API 호출
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // 토큰 저장
        let accessToken = null;
        if (data?.data?.token) {
          accessToken = data.data.token;
        }

        // JWT 토큰에서 사용자 정보 추출
        let userInfo = null;
        if (accessToken) {
          try {
            const payload = accessToken.split(".")[1];
            const decoded = JSON.parse(atob(payload));

            // JWT에서 사용자 정보 추출
            const userId = decoded.sub || decoded.userId || decoded.id;
            const username = decoded.nickname || decoded.username || "사용자";
            const userEmail = decoded.email || email;

            userInfo = {
              id: userId,
              username: username,
              email: userEmail,
            };
          } catch (tokenError) {
            console.error("JWT 토큰 디코딩 실패:", tokenError);
            // 토큰 디코딩 실패 시 API 응답에서 사용자 정보 확인
            if (data?.data?.user) {
              userInfo = {
                id: data.data.user.id,
                username: data.data.user.nickname || data.data.user.username,
                email: data.data.user.email || email,
              };
            }
          }
        }

        // API 응답에 사용자 정보가 있으면 우선 사용
        if (data?.data?.user) {
          userInfo = {
            id: data.data.user.id || userInfo?.id,
            username:
              data.data.user.nickname ||
              data.data.user.username ||
              userInfo?.username,
            email: data.data.user.email || userInfo?.email || email,
          };
        }

        // 사용자 정보가 없으면 에러
        if (!userInfo || !userInfo.id) {
          console.error("사용자 정보를 가져올 수 없습니다:", data);
          showToast("로그인 응답에서 사용자 정보를 찾을 수 없습니다.", "error");
          return;
        }

        // AuthContext에도 로그인 반영 (헤더 업데이트용)
        const refreshToken = data?.data?.refreshToken || "";
        authLogin(accessToken as string, refreshToken, {
          userId: userInfo.id,
          email: userInfo.email,
          nickname: userInfo.username,
        });

        // 사용자 역할에 따라 리다이렉트
        const userRole =
          email === "reum01060106@gmail.com"
            ? "ADMIN"
            : data?.data?.role || "USER";
        if (userRole === "ADMIN") {
          router.push("/admin");
        } else {
          router.push(redirectPath || "/");
        }
      } else {
        let errorMessage = "이메일 또는 비밀번호가 일치하지 않습니다.";
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            // 백엔드에서 "로그인 실패"만 오는 경우 더 구체적인 메시지로 변경
            if (errorData.message === "로그인 실패") {
              errorMessage = "이메일 또는 비밀번호가 일치하지 않습니다.";
            } else {
              errorMessage = errorData.message;
            }
          }
        } catch (e) {
          console.error("에러 응답 파싱 실패:", e);
        }
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("로그인 오류:", error);
      showToast("로그인 중 오류가 발생했습니다.", "error");
    }
  };

  const handlePasswordReset = () => {
    setShowPasswordReset(true);
  };

  const handleSignup = () => {
    router.push("/signup");
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* 로그인 카드 */}

          {/* 헤더 */}
          <div className="text-center my-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              카페 OFF 상태, 로그인
            </h1>
            <p className="text-gray-600 text-base leading-relaxed">
              당신의 무드에 맞는 완벽한 카페를 쉽고 빠르게 발견하기 위해
              로그인하세요.
            </p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-3">
            {/* 이메일 입력 */}
            <div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {/* 비밀번호 보기/숨기기 버튼 */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    disabled={isLoading}
                  >
                    {showPassword ? (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                  {/* 비밀번호 재설정 버튼 */}
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                    disabled={isLoading}
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <Button type="submit" color="primary" size="md" className="w-full">
              로그인
            </Button>

            {/* 회원가입 버튼 */}
            <Button
              type="button"
              color="secondary"
              size="md"
              onClick={handleSignup}
              className="w-full"
            >
              회원가입
            </Button>
          </form>
        </div>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              비밀번호 재설정
            </h2>
            <p className="text-gray-600 mb-6">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를
              보내드립니다.
            </p>

            <form className="space-y-4">
              <input
                type="email"
                placeholder="이메일 주소"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  color="gray"
                  size="md"
                  onClick={() => setShowPasswordReset(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="md"
                  className="flex-1"
                >
                  전송
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="min-h-full flex items-center justify-center px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">로그인 페이지를 불러오는 중입니다.</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
