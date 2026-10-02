"use client";

/**
 * 공개 페이지 상단 네비게이션 (클라이언트 부분)
 *
 * 모바일에서는 메뉴가 숨겨져(hidden sm:block) 참여 기관·후원 안내·기관 로그인에
 * 접근할 방법이 없었다. → 좁은 화면에서는 햄버거 메뉴로 모으고,
 * 우측에는 상황에 맞는 버튼(로그인 / 마이페이지 / 대시보드) 하나만 둔다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCircle2, LogIn, Menu, X } from "lucide-react";

const MENU = [
  { href: "/organizations", label: "참여 기관" },
  { href: "/campaigns", label: "모금 캠페인" },
  { href: "/#sms", label: "후원 안내" },
];

export type PublicNavVariant = "guest" | "donor" | "admin";

export function PublicNav({
  variant,
  dashboardHref,
}: {
  variant: PublicNavVariant;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 페이지가 바뀌면 메뉴를 닫는다.
  useEffect(() => setOpen(false), [pathname]);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const action =
    variant === "donor"
      ? { href: "/my", label: "마이페이지", Icon: UserCircle2 }
      : variant === "admin"
        ? { href: dashboardHref, label: "대시보드", Icon: LayoutDashboard }
        : { href: "/login", label: "로그인", Icon: LogIn };

  const ActionIcon = action.Icon;

  return (
    <>
      <nav className="flex items-center gap-1 text-sm">
        {/* 넓은 화면: 메뉴를 그대로 펼친다 */}
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="hidden rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-50 sm:block"
          >
            {m.label}
          </Link>
        ))}

        <Link
          href={action.href}
          className="ml-1 flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          <ActionIcon className="h-4 w-4" strokeWidth={1.75} />
          {action.label}
        </Link>

        {/* 좁은 화면: 햄버거 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          className="ml-1 grid h-10 w-10 place-items-center rounded-xl text-stone-600 hover:bg-stone-50 sm:hidden"
        >
          {open ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </nav>

      {/* 모바일 드롭다운 — 헤더(z-50)가 덮개(z-40) 위에 있어 닫기 버튼은 계속 눌린다 */}
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-stone-900/10 sm:hidden"
          />
          <div
            id="public-mobile-menu"
            className="absolute inset-x-0 top-full z-50 border-b border-[#eee4d6] bg-[#fffdf9] shadow-[0_8px_20px_rgba(91,65,40,0.08)] sm:hidden"
          >
            <ul className="mx-auto max-w-6xl px-4 py-2">
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
