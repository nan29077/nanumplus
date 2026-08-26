"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
    // 서버 로그에 남겨 "오류 코드"만으로도 원인 추적이 가능하게 한다.
    fetch("/api/public/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boundary: "root",
        digest: error.digest ?? "",
        message: error.message,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-lg font-bold text-stone-900">페이지를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-stone-500">
          일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {error.digest && (
          <p className="mt-2 rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-400">
            오류 코드: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
