"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Home, Megaphone, UserCircle2, LogOut, X, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { getOrganizationAvatar } from "@/lib/organization-avatar";

export type ShellOrg = {
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};
export type ShellDonor = { name: string; image: string | null } | null;

type NavKey = "home" | "campaigns" | "my";

export function DonateShell({
  org, themeColor, donor, active, children,
}: {
  org: ShellOrg;
  themeColor: string;
  donor: ShellDonor;
  active: NavKey;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loginOpen, setLoginOpen] = useState(false);

  const base = `/donate/${org.slug}`;
  const nav: { key: NavKey; label: string; href: string; icon: typeof Home; needLogin?: boolean }[] = [
    { key: "home", label: "홈", href: base, icon: Home },
    { key: "campaigns", label: "모금 캠페인", href: `${base}/campaigns`, icon: Megaphone },
    { key: "my", label: "마이페이지", href: `${base}/my`, icon: UserCircle2, needLogin: true },
  ];

  const logoSrc = org.logoUrl || getOrganizationAvatar(org.name);
  const Logo = (
    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-sm">
      <Image src={logoSrc} alt={`${org.name} 로고`} fill sizes="36px" className="object-cover" unoptimized />
    </span>
  );

  const LoginBtn = ({ full }: { full?: boolean }) =>
    donor ? (
      <Link href={`${base}/my`}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white ${full ? "w-full" : ""}`}
        style={{ backgroundColor: themeColor }}>
        {donor.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={donor.image} alt="" className="h-5 w-5 rounded-full object-cover" />
          : <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />}
        <span className="truncate">{donor.name}</span>
      </Link>
    ) : (
      <button onClick={() => setLoginOpen(true)}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white ${full ? "w-full" : ""}`}
        style={{ backgroundColor: themeColor }}>
        <UserCircle2 className="h-4 w-4" strokeWidth={1.75} /> 로그인
      </button>
    );

  const navClick = (n: (typeof nav)[number], e: React.MouseEvent) => {
    if (n.needLogin && !donor) { e.preventDefault(); setLoginOpen(true); }
  };

  return (
    <div className="min-h-screen bg-warm-50">
      {/* 상단 바: 좌측 로고+기관명 / 모바일 우측 로그인 */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 lg:max-w-none lg:pr-60">
          <Link href={base} className="flex items-center gap-2.5">
            {Logo}
            <span className="text-base font-bold text-stone-900">{org.name}</span>
          </Link>
          <div className="lg:hidden">
            <LoginBtn />
          </div>
        </div>
      </header>

      {/* PC 우측 세로 메뉴 + 하단 로그인 */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-56 flex-col border-l border-stone-200 bg-white px-4 pb-6 pt-24 lg:flex">
        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const on = active === n.key;
            return (
              <Link key={n.key} href={n.href} onClick={(e) => navClick(n, e)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm"
                style={on ? { backgroundColor: `${themeColor}14`, color: themeColor, fontWeight: 600 } : { color: "#57534e" }}>
                <n.icon className="h-[18px] w-[18px]" strokeWidth={1.75} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2">
          <LoginBtn full />
          {donor && (
            <button onClick={() => signOut({ callbackUrl: base })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-500 hover:bg-stone-50">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> 로그아웃
            </button>
          )}
        </div>
      </aside>

      {/* 본문 */}
      <main className="mx-auto max-w-2xl px-4 pb-28 lg:max-w-none lg:pr-60">
        <div className="mx-auto max-w-2xl">{children}</div>

        {/* 기관 정보 푸터 */}
        <footer className="mx-auto mt-10 max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          <div className="flex items-center gap-2.5">
            {Logo}
            <span className="font-bold text-stone-900">{org.name}</span>
          </div>
          {org.description && <p className="mt-3 leading-relaxed">{org.description}</p>}
          <div className="mt-4 space-y-1.5 text-xs">
            {org.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.75} /> {org.address}</p>}
            {org.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.75} /> {org.phone}</p>}
            {org.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.75} /> {org.email}</p>}
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-[11px] text-stone-400">
            © {new Date().getFullYear()} {org.name} · 나눔플러스 후원 페이지
          </p>
        </footer>
      </main>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden">
        {nav.map((n) => {
          const on = active === n.key;
          return (
            <Link key={n.key} href={n.href} onClick={(e) => navClick(n, e)}
              className="flex flex-col items-center gap-0.5 py-2.5 text-[11px]"
              style={{ color: on ? themeColor : "#a8a29e", fontWeight: on ? 600 : 400 }}>
              <n.icon className="h-5 w-5" strokeWidth={1.75} /> {n.label}
            </Link>
          );
        })}
      </nav>

      {loginOpen && (
        <LoginModal onClose={() => setLoginOpen(false)} themeColor={themeColor} callbackUrl={pathname || base} />
      )}
    </div>
  );
}

function LoginModal({ onClose, themeColor, callbackUrl }: { onClose: () => void; themeColor: string; callbackUrl: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState(false);

  const go = (p: "kakao" | "naver") => { setBusy(p); signIn(p, { callbackUrl }); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-stone-900/40 sm:place-items-center" role="dialog" aria-modal onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-6 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">후원자 로그인</h2>
          <button onClick={onClose} aria-label="닫기" className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-500">로그인하면 후원 내역과 정기후원을 관리할 수 있어요.</p>

        <div className="mt-5 space-y-2.5">
          <button onClick={() => go("kakao")} disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191600] hover:brightness-95 disabled:opacity-60">
            {busy === "kakao" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 카카오로 로그인
          </button>
          <button onClick={() => go("naver")} disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60">
            {busy === "naver" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 네이버로 로그인
          </button>
          <button onClick={() => setEmailNotice(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <Mail className="h-4 w-4" strokeWidth={1.75} /> 이메일로 로그인 / 회원가입
          </button>
        </div>

        {emailNotice && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-amber-900">이메일 로그인은 준비 중입니다</p>
            <p className="mt-1 text-xs text-amber-700">지금은 카카오·네이버 로그인을 이용해 주세요. 곧 열릴게요!</p>
            <button onClick={() => setEmailNotice(false)} className="mt-2 text-xs font-medium text-amber-800 underline">닫기</button>
          </div>
        )}
      </div>
    </div>
  );
}
