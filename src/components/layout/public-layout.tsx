import Link from "next/link";
import { getSessionUser } from "@/lib/rbac";
import { BrandMark } from "@/components/brand-mark";
import { PublicNav, type PublicNavVariant } from "@/components/layout/public-nav";

export async function PublicHeader() {
  const user = await getSessionUser();
  const isDonor = user?.kind === "donor";
  const isAdmin = !!user && !isDonor;
  const dashboardHref = user?.role === "SUPER_ADMIN" ? "/admin/dashboard" : "/org/dashboard";
  const variant: PublicNavVariant = isDonor ? "donor" : isAdmin ? "admin" : "guest";

  return (
    <header className="sticky top-0 z-50 border-b border-[#eee4d6] bg-[#fffdf9]/95 shadow-[0_4px_20px_rgba(91,65,40,0.05)] backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="text-base font-bold tracking-tight text-stone-900">나눔플러스</span>
        </Link>
        <PublicNav variant={variant} dashboardHref={dashboardHref} />
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[#eee3d5] bg-[#f8f1e8]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-bold text-stone-900">나눔플러스</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            사회복지기관을 위한 투명한 후원금 모금 관리 플랫폼.
            문자후원, 간편 계좌이체, 정기후원을 한 곳에서 관리하세요.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-stone-800">후원 방법</p>
          <ul className="mt-3 space-y-2 text-stone-500">
            <li>문자후원 (#2540)</li>
            <li>간편 계좌이체 (온기)</li>
            <li>정기 계좌후원</li>
            <li>QR 코드 후원</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-stone-800">기관 안내</p>
          <ul className="mt-3 space-y-2 text-stone-500">
            <li><Link href="/login?tab=org" className="hover:text-brand-600">기관 로그인</Link></li>
            <li><Link href="/#process" className="hover:text-brand-600">도입 프로세스</Link></li>
            <li><Link href="/#faq" className="hover:text-brand-600">자주 묻는 질문</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        © 2026 나눔플러스. 모든 후원 내역은 투명하게 기록·공개됩니다.
      </div>
    </footer>
  );
}
