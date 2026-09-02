"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Home, Megaphone, UserCircle2, LogOut, LogIn, X, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { getOrganizationAvatar } from "@/lib/organization-avatar";
import { BrandMark } from "@/components/brand-mark";

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
  const OrgLogo = ({ large = false }: { large?: boolean }) => (
    <span className={`relative shrink-0 overflow-hidden border border-[#eadfce] bg-white shadow-sm ${large ? "h-16 w-16 rounded-[1.35rem]" : "h-9 w-9 rounded-xl"}`}>
      <Image
        src={logoSrc}
        alt={`${org.name} 로고`}
        fill
        sizes={large ? "64px" : "36px"}
        className={org.logoUrl ? "object-contain p-1" : "object-cover"}
        unoptimized
      />
    </span>
  );

  const LoginBtn = () =>
    donor ? (
      <Link href={`${base}/my`}
        className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: themeColor }}>
        {donor.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={donor.image} alt="" className="h-5 w-5 rounded-full object-cover" />
          : <UserCircle2 className="h-4 w-4" strokeWidth={1.75} />}
        <span className="truncate">{donor.name}</span>
      </Link>
    ) : (
      <button onClick={() => setLoginOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: themeColor }}>
        <UserCircle2 className="h-4 w-4" strokeWidth={1.75} /> 로그인
      </button>
    );

  const navClick = (n: (typeof nav)[number], e: React.MouseEvent) => {
    if (n.needLogin && !donor) { e.preventDefault(); setLoginOpen(true); }
  };

  return (
    <div className="relative min-h-screen bg-warm-50 lg:bg-[#f6eedf]">
      {/* PC 전용 나눔플러스 배경 */}
      <div
        className="pointer-events-none fixed inset-0 hidden bg-cover bg-center bg-no-repeat lg:block"
        style={{ backgroundImage: "url('/images/donation-shell/nanum-community-desktop-bg.jpg')" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 hidden bg-white/10 lg:block" aria-hidden="true" />

      <div className="relative mx-auto min-h-screen lg:grid lg:w-fit lg:grid-cols-[700px_104px] lg:items-start lg:gap-4 lg:py-6 xl:gap-5">
        <div className="min-h-screen bg-warm-50 lg:w-[700px] lg:rounded-[2rem] lg:border lg:border-white/80 lg:shadow-[0_24px_70px_rgba(85,63,39,0.18)]">
          {/* 모바일: 기관 정보 / PC: 나눔플러스 브랜드 */}
          <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur lg:static lg:rounded-t-[2rem] lg:border-[#eee3d4]">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
              <Link href={base} className="flex items-center gap-2.5 lg:hidden">
                <OrgLogo />
                <span className="max-w-[13rem] truncate text-base font-bold text-stone-900">{org.name}</span>
              </Link>
              <Link href="/" className="hidden items-center gap-2 lg:flex" aria-label="나눔플러스 메인으로 이동">
                <BrandMark className="h-8 w-8" />
                <span className="text-sm font-bold tracking-tight text-stone-900">나눔플러스</span>
                <span className="text-xs text-stone-400">후원페이지</span>
              </Link>
              <div className="lg:hidden">
                <LoginBtn />
              </div>
              <p className="hidden text-xs text-stone-400 lg:block">작은 마음이 만드는 따뜻한 변화</p>
            </div>
          </header>

          {/* 본문 */}
          <main className="mx-auto max-w-2xl px-4 pb-28 lg:px-5 lg:pb-12">
            <div>{children}</div>

            {/* 기관 정보 푸터 */}
            <footer className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
              <div className="flex items-center gap-2.5">
                <OrgLogo />
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
        </div>

        {/* PC 우측 플로팅 메뉴 */}
        <aside className="sticky top-6 z-30 hidden w-[104px] flex-col items-center rounded-[1.75rem] border border-white/90 bg-white/95 px-2.5 py-3.5 shadow-[0_16px_40px_rgba(85,63,39,0.16)] backdrop-blur lg:flex">
          <Link href={base} className="flex w-full flex-col items-center rounded-2xl px-1 py-1.5 text-center" title={org.name}>
            <OrgLogo large />
            <span className="mt-2 line-clamp-2 w-full break-keep text-[11px] font-bold leading-[1.35] text-stone-800">{org.name}</span>
          </Link>

          <div className="my-3 h-px w-12 bg-stone-200" />

          <nav className="w-full space-y-1.5" aria-label={`${org.name} 후원페이지 메뉴`}>
            {nav.map((n) => {
              const on = active === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={(e) => navClick(n, e)}
                  aria-current={on ? "page" : undefined}
                  className="flex min-h-[62px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center text-[11px] font-medium transition hover:bg-stone-50"
                  style={on ? { backgroundColor: `${themeColor}14`, color: themeColor, fontWeight: 700 } : { color: "#78716c" }}
                >
                  <n.icon className="h-5 w-5" strokeWidth={on ? 2 : 1.75} />
                  <span className="leading-tight">{n.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="my-3 h-px w-12 bg-stone-200" />

          {donor ? (
            <button
              onClick={() => signOut({ callbackUrl: base })}
              className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-stone-500 transition hover:bg-stone-50"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-bold text-white shadow-sm transition hover:brightness-95"
              style={{ backgroundColor: themeColor }}
            >
              <LogIn className="h-5 w-5" strokeWidth={1.8} />
              로그인
            </button>
          )}
        </aside>
      </div>

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
