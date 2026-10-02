import { redirect } from "next/navigation";

/**
 * 구 후원자 로그인 주소 — 통합 로그인(/login)의 후원자 탭으로 넘긴다.
 *
 * 북마크·외부 링크·기존 리다이렉트(lib/donor-auth.ts)가 이 주소를 쓰고 있으므로
 * 경로를 없애지 않고 유지한다. OAuth 콜백은 /api/auth/callback/* 이라 영향 없다.
 */
export default function DonorLoginRedirect({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const cb = searchParams?.callbackUrl;
  redirect(`/login?tab=donor${cb ? `&callbackUrl=${encodeURIComponent(cb)}` : ""}`);
}
