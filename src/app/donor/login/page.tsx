"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Loader2 } from "lucide-react";

function DonorLoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/my";
  const [busy, setBusy] = useState<string | null>(null);

  const go = (provider: "kakao" | "naver" | "google") => {
    setBusy(provider);
    signIn(provider, { callbackUrl });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-warm-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-lg font-bold text-stone-900">나눔플러스</span>
        </Link>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h1 className="text-lg font-bold text-stone-900">후원자 로그인</h1>
          <p className="mt-1 text-sm text-stone-500">
            간편 로그인하면 여러 기관에 후원한 내역과 정기후원을 한 곳에서 관리할 수 있어요.
          </p>

          <div className="mt-6 space-y-2.5">
            <button onClick={() => go("kakao")} disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191600] hover:brightness-95 disabled:opacity-60">
              {busy === "kakao" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KakaoIcon />}
              카카오로 로그인
            </button>
            <button onClick={() => go("naver")} disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60">
              {busy === "naver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <NaverIcon />}
              네이버로 로그인
            </button>
            <button onClick={() => go("google")} disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60">
              {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Google로 로그인
            </button>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-400">
            로그인 시 개인정보 처리방침에 동의하는 것으로 간주됩니다.<br />
            기관 관리자이신가요? <Link href="/login" className="text-brand-600 hover:underline">관리자 로그인</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function DonorLoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-warm-50"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></main>}>
      <DonorLoginInner />
    </Suspense>
  );
}

function KakaoIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3C6.5 3 2 6.6 2 11c0 2.9 1.9 5.4 4.8 6.8-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.6-1.8 3.7-2.5.6.1 1.2.1 1.9.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>;
}
function NaverIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.3 12.6 7.9 1H1v22h6.7V11.4L16.1 23H23V1h-6.7z"/></svg>;
}
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
