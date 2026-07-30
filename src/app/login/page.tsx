"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Lock, Mail, Loader2, ShieldCheck, Building2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="#000000">
      <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.568 1.517 4.822 3.84 6.234L4.8 20.1a.3.3 0 0 0 .44.334l4.33-2.872A11.6 11.6 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="#FFFFFF">
      <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
    </svg>
  );
}

const DEMO_ACCOUNTS = [
  {
    label: "최고 관리자",
    icon: ShieldCheck,
    email: "admin@onjung.kr",
    password: "admin1234",
    color: "bg-brand-600 hover:bg-brand-700 text-white",
    desc: "전체 관리 권한",
  },
  {
    label: "기관 관리자",
    icon: Building2,
    email: "manager1@onjung.kr",
    password: "org1234",
    color: "bg-stone-700 hover:bg-stone-800 text-white",
    desc: "따뜻한손길복지재단",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  // 이미 로그인된 사용자는 대시보드로 바로 이동
  useEffect(() => {
    if (status !== "authenticated") return;
    const u = session?.user as { role?: string; organizationId?: string | null } | undefined;

    if (u?.role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
      return;
    }
    // 기관관리자인데 소속 기관이 없으면 /org/* 진입이 막혀 로그인 ↔ 대시보드 무한 이동이 발생한다.
    // 이 경우에는 리다이렉트하지 않고 원인을 안내한다.
    if (u?.organizationId) {
      router.replace("/org/dashboard");
      return;
    }
    setError("소속 기관이 지정되지 않은 계정입니다. 최고관리자에게 기관 배정을 요청해 주세요.");
  }, [status, session, router]);
  const [busy, setBusy] = useState<string | null>(null);

  const doLogin = async (em: string, pw: string, key: string) => {
    setBusy(key);
    setError("");
    try {
      const res = await signIn("credentials", { email: em, password: pw, redirect: false });
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password, "email");
  };

  const socialLogin = async (provider: string) => {
    setBusy(provider);
    await signIn(provider, { callbackUrl: "/after-login" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-warm-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-4">

        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-lg font-bold text-stone-900">나눔플러스</span>
        </Link>

        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="mb-3 text-xs font-semibold text-brand-700">테스트 계정으로 바로 로그인</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isLoading = busy === acc.email;
              return (
                <button
                  key={acc.email}
                  onClick={() => doLogin(acc.email, acc.password, acc.email)}
                  disabled={!!busy}
                  className={"flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left transition-opacity disabled:opacity-60 " + acc.color}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {acc.label}
                  </span>
                  <span className="text-[10px] opacity-75">{acc.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card"
        >
          <h1 className="text-lg font-bold text-stone-900">관리자 로그인</h1>
          <p className="mt-1 text-sm text-stone-500">이메일과 비밀번호로 로그인하세요.</p>

          <label className="mt-5 block text-sm font-medium text-stone-700">이메일</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
            <Mail className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <label className="mt-4 block text-sm font-medium text-stone-700">비밀번호</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
            <Lock className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={!!busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy === "email" ? "로그인 중..." : "이메일로 로그인"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs text-stone-400">또는 소셜 로그인</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => socialLogin("google")}
              disabled={!!busy}
              className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              {busy === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
              ) : (
                <GoogleIcon />
              )}
              Google로 계속하기
            </button>

            <button
              type="button"
              onClick={() => socialLogin("kakao")}
              disabled={!!busy}
              className="flex w-full items-center gap-3 rounded-xl bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#3C1E1E] hover:bg-[#F0D800] disabled:opacity-50 transition-colors"
            >
              {busy === "kakao" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KakaoIcon />
              )}
              카카오로 계속하기
            </button>

            <button
              type="button"
              onClick={() => socialLogin("naver")}
              disabled={!!busy}
              className="flex w-full items-center gap-3 rounded-xl bg-[#03C75A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#02B350] disabled:opacity-50 transition-colors"
            >
              {busy === "naver" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <NaverIcon />
              )}
              네이버로 계속하기
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-stone-400">
            소셜 로그인은 환경변수 설정 후 활성화됩니다
          </p>
        </form>

      </div>
    </main>
  );
}
