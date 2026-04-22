"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/common/Button";
import { useEscapeKey } from "../../../src/hooks/useEscapeKey";
import Header from "@/components/common/Header";
import { useToastContext } from "@/components/common/ToastProvider";
import { useAuth as useAuthContext } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

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
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        showToast("Supabase 설정이 없어 게스트 모드를 사용해주세요.", "error");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session || !data.user) {
        showToast(error?.message || "이메일 또는 비밀번호가 일치하지 않습니다.", "error");
        return;
      }

      authLogin(data.session.access_token, data.session.refresh_token ?? "", {
        userId: data.user.id,
        email: data.user.email || email,
        nickname:
          (data.user.user_metadata?.nickname as string) ||
          (data.user.user_metadata?.name as string) ||
          "사용자",
      });

      router.push(redirectPath || "/");
    } catch (error) {
      console.error("로그인 오류:", error);
      showToast("로그인 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    authLogin(`guest-token-${Date.now()}`, `guest-refresh-${Date.now()}`, {
      userId: "guest-user",
      email: "guest@cafeon.local",
      nickname: "게스트",
      name: "게스트 사용자",
      profileImageUrl: null,
    });
    showToast("게스트 모드로 로그인했습니다.", "success");
    router.push(redirectPath || "/");
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
            <Button
              type="button"
              color="gray"
              size="md"
              onClick={handleGuestLogin}
              className="w-full"
            >
              게스트 모드로 시작
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
