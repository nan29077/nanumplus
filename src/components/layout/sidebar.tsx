"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { HeartHandshake, LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { heading: string; items: NavItem[] };
export type NavSection = NavItem | NavGroup;

function isGroup(s: NavSection): s is NavGroup {
  return "heading" in s;
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
        active
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-stone-600 hover:bg-stone-50"
      )}
    >
      <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  sections, title, userName, logoHref = "/",
}: { sections: NavSection[]; title: string; userName: string; logoHref?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href={logoHref} className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
          <HeartHandshake className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-bold text-stone-900">나눔플러스</p>
          <p className="text-[11px] text-stone-400">{title}</p>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {sections.map((section, idx) => {
          if (isGroup(section)) {
            return (
              <div key={idx} className="mb-1">
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  {section.heading}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={isActive(item.href)}
                        onClick={() => setOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          // 단독 아이템 (그룹 없음)
          return (
            <ul key={idx} className="mt-1 space-y-0.5">
              <li>
                <NavLink
                  item={section}
                  active={isActive(section.href)}
                  onClick={() => setOpen(false)}
                />
              </li>
            </ul>
          );
        })}
      </div>

      <div className="border-t border-stone-100 p-3">
        <p className="px-3 pb-2 text-xs text-stone-400">{userName} 님</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          로그아웃
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-bold text-stone-900">나눔플러스 · {title}</span>
        <button onClick={() => setOpen(true)} aria-label="메뉴 열기"
          className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-stone-600">
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} aria-label="메뉴 닫기"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
            {nav}
          </div>
        </div>
      )}
      {/* 데스크톱 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200 bg-white lg:block">
        {nav}
      </aside>
    </>
  );
}
