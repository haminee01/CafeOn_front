"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState('');

  useEffect(() => {
    const handleCallback = () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const providerParam = searchParams.get('provider');

      if (error) {
        setStatus('error');
        setMessage('로그인 중 오류가 발생했습니다.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      if (code) {
        setStatus('success');
        setProvider(providerParam || '소셜');
        setMessage(`${providerParam || '소셜'} 로그인이 완료되었습니다!`);
        
        // 3초 후 홈페이지로 이동
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage('인증 정보를 받지 못했습니다.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full text-center px-4">
        {status === 'loading' && (
          <>
            <div className="mb-8">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-4">CafeOn.</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              로그인 처리 중입니다.<br />
              잠시만 기다려주세요.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-8">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-4">CafeOn.</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500">
              잠시 후 홈페이지로 이동합니다...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-red-600"
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
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-4">CafeOn.</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
            <button
              onClick={() => router.push('/login')}
              className="inline-block bg-primary text-white py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              로그인 페이지로 이동
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="max-w-md w-full text-center px-4">
            <div className="mb-8">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-4">CafeOn.</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              로그인 처리 중입니다.
              <br />
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      }
    >
      <CallbackPageContent />
    </Suspense>
  );
}
