"use client";

/**
 * 통합 로그인 페이지 — 후원자 / 기관·관리자 탭
 *
 * 배경: 모바일 헤더에 로그인 버튼이 두 개(기관·후원자) 들어가면서 좁은 화면에서
 * 기관 로그인이 숨겨져(hidden sm:block) 폰으로는 기관 로그인 경로가 없었다.
 * → 헤더에는 "로그인" 하나만 두고, 이 페이지에서 탭으로 갈라준다.
 *
 * 탭 선택 규칙:
 *  - ?tab=org / ?tab=donor 가 있으면 그대로 따른다.
 *  - 관리자가 튕겨 온 흔적(error=, pwchanged=, callbackUrl 이 /admin·/org)이 있으면 기관 탭.
 *    (세션 만료로 돌아온 관리자에게 카카오 로그인 버튼을 보여주면 안 된다)
 *  - 그 밖에는 후원자 탭. 방문자 절대다수가 후원자다.
 *
 * 최고관리자는 기관관리자와 동일한 Credentials 경로로 로그인하고,
 * 로그인 후 역할에 따라 /admin 또는 /org 로 갈라진다. (별도 입구 없음)
 */

import { Suspense, useState, useEffect, useMemo } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Lock, Mail, Loader2, Building2, UserCircle2 } from "lucide-react";

type Tab = "donor" | "org";

/** 관리자 전용 경로로 돌아가려던 흔적인지 */
function isAdminPath(path: string): boolean {
  return /^\/(admin|org|after-login)(\/|$|\?)/.test(path);
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();

  const rawCallback = params.get("callbackUrl") ?? "";
  const errorParam = params.get("error");
  const pwChanged = params.get("pwchanged");
  const tabParam = params.get("tab");

  // 초기 탭 결정
  const initialTab: Tab = useMemo(() => {
    if (tabParam === "org" || tabParam === "donor") return tabParam;
    if (errorParam || pwChanged) return "org";
    if (rawCallback && isAdminPath(rawCallback)) return "org";
    return "donor";
  }, [tabParam, errorParam, pwChanged, rawCallback]);

  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  // 관리자 경로로 가려던 callbackUrl 을 후원자 로그인에 쓰면 로그인 직후 다시 튕긴다.
  const donorCallback = rawCallback && !isAdminPath(rawCallback) ? rawCallback : "/my";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // 튕겨 온 이유 안내
  useEffect(() => {
    if (errorParam === "session") {
      setError("세션이 만료되었거나 로그인 정보가 없습니다. 다시 로그인해 주세요.");
    } else if (errorParam === "no-org") {
      setError("소속 기관이 지정되지 않은 계정입니다. 최고관리자에게 기관 배정을 요청해 주세요.");
    } else if (errorParam === "org_inactive") {
      setError("비활성화된 기관의 계정입니다. 최고관리자에게 문의해 주세요.");
    } else if (pwChanged) {
      setNotice("비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.");
    }
  }, [errorParam, pwChanged]);

  // 이미 로그인된 관리자는 대시보드로
  useEffect(() => {
    if (status !== "authenticated") return;
    const u = session?.user as
      | { role?: string; organizationId?: string | null; kind?: string }
      | undefined;
    // 무효화된 토큰(비밀번호 변경·로그아웃·계정 비활성)은 세션에 user 가 없다.
    if (!u) return;

    if (u.kind === "donor") {
      router.replace("/my");
      return;
    }
    if (u.role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
      return;
    }
    // 기관관리자인데 소속 기관이 없으면 /org/* 진입이 막혀 무한 이동이 발생한다.
    if (u.organizationId) {
      router.replace("/org/dashboard");
      return;
    }
    setError("소속 기관이 지정되지 않은 계정입니다. 최고관리자에게 기관 배정을 요청해 주세요.");
  }, [status, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError("");
    setNotice("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      setBusy(null);
      if (!res || res.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      router.push("/after-login");
      router.refresh();
    } catch {
      setBusy(null);
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const social = (provider: "kakao" | "naver" | "google") => {
    setBusy(provider);
    signIn(provider, { callbackUrl: donorCallback });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError("");
    setNotice("");
  };

  const tabClass = (active: boolean) =>
    [
      "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
      active
        ? "bg-white text-brand-700 shadow-[0_1px_3px_rgba(91,65,40,0.12)]"
        : "text-stone-500 hover:text-stone-700",
    ].join(" ");

  return (
    <main className="grid min-h-screen place-items-center bg-warm-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-lg font-bold text-stone-900">나눔플러스</span>
        </Link>

        {/* 탭 */}
        <div
          role="tablist"
          aria-label="로그인 종류"
          className="flex gap-1 rounded-2xl bg-[#f1e9dd] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "donor"}
            onClick={() => switchTab("donor")}
            className={tabClass(tab === "donor")}
          >
            <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />
            후원자
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "org"}
            onClick={() => switchTab("org")}
            className={tabClass(tab === "org")}
          >
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
            기관·관리자
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          {tab === "donor" ? (
            <>
              <h1 className="text-lg font-bold text-stone-900">후원자 로그인</h1>
              <p className="mt-1 text-sm text-stone-500">
                간편 로그인하면 여러 기관에 후원한 내역과 정기후원을 한 곳에서 관리할 수 있어요.
              </p>

              <div className="mt-6 space-y-2.5">
                <button
                  onClick={() => social("kakao")}
                  disabled={!!busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191600] hover:brightness-95 disabled:opacity-60"
                >
                  {busy === "kakao" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KakaoIcon />}
                  카카오로 로그인
                </button>
                <button
                  onClick={() => social("naver")}
                  disabled={!!busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
                >
                  {busy === "naver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <NaverIcon />}
                  네이버로 로그인
                </button>
                <button
                  onClick={() => social("google")}
                  disabled={!!busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                >
                  {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Google로 로그인
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-400">
                로그인 시 개인정보 처리방침에 동의하는 것으로 간주됩니다.
              </p>
            </>
          ) : (
            <form onSubmit={submit}>
              <h1 className="text-lg font-bold text-stone-900">기관·관리자 로그인</h1>
              <p className="mt-1 text-sm text-stone-500">
                기관 관리자와 최고관리자 모두 이곳에서 로그인합니다.
              </p>

              <label htmlFor="login-email" className="mt-5 block text-sm font-medium text-stone-700">
                이메일
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
                <Mail className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <label htmlFor="login-password" className="mt-4 block text-sm font-medium text-stone-700">
                비밀번호
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
                <Lock className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!!busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy === "email" ? "로그인 중..." : "이메일로 로그인"}
              </button>
            </form>
          )}

          {notice && (
            <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-warm-50">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function KakaoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.9 1.9 5.4 4.8 6.8-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.6-1.8 3.7-2.5.6.1 1.2.1 1.9.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
    </svg>
  );
}
function NaverIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.3 12.6 7.9 1H1v22h6.7V11.4L16.1 23H23V1h-6.7z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
