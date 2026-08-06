"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  // /after-login 이 되돌려 보낸 오류 파라미터(?error=session|no-org)를 읽어 원인을 안내한다.
  // (파라미터를 무시하면 사용자는 아무 안내 없이 로그인 화면으로 튕긴 것처럼 보인다)
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err === "session") {
      setError("세션이 만료되었거나 로그인 정보가 없습니다. 다시 로그인해 주세요.");
    } else if (err === "no-org") {
      setError("소속 기관이 지정되지 않은 계정입니다. 최고관리자에게 기관 배정을 요청해 주세요.");
    }
  }, []);

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

  return (
    <main className="grid min-h-screen place-items-center bg-warm-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-4">

        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-lg font-bold text-stone-900">나눔플러스</span>
        </Link>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card"
        >
          <h1 className="text-lg font-bold text-stone-900">관리자 로그인</h1>
          <p className="mt-1 text-sm text-stone-500">이메일과 비밀번호로 로그인하세요.</p>

          <label htmlFor="login-email" className="mt-5 block text-sm font-medium text-stone-700">이메일</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
            <Mail className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <label htmlFor="login-password" className="mt-4 block text-sm font-medium text-stone-700">비밀번호</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 focus-within:border-brand-500">
            <Lock className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
            <input
              id="login-password"
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
        </form>

      </div>
    </main>
  );
}
