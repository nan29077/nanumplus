"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error.message, error.digest);
    // 서버 로그에 남겨 "오류 코드"만으로도 원인 추적이 가능하게 한다.
    fetch("/api/public/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boundary: "admin",
        digest: error.digest ?? "",
        message: error.message,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-card">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-stone-900">페이지 로드 오류</h2>
            <p className="mt-1 text-sm text-stone-500">
              관리자 페이지를 불러오는 중 오류가 발생했습니다.
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs text-rose-700">
                {error.message}
              </pre>
            )}
            {error.digest && (
              <p className="mt-2 text-xs text-stone-400">오류 코드: {error.digest}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            다시 시도
          </button>
          <Link
            href="/admin/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            <Home className="h-4 w-4" strokeWidth={1.75} />
            대시보드
          </Link>
        </div>
      </div>
    </div>
  );
}
