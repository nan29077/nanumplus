"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

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
  sections, title, userName, logoHref = "/", avatarUrl,
}: { sections: NavSection[]; title: string; userName: string; logoHref?: string; avatarUrl?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href={logoHref} className="flex items-center gap-2 px-5 py-5">
        <BrandMark />
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
        {avatarUrl ? (
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#f8f3e9] to-brand-50 p-2.5">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
              <Image src={avatarUrl} alt={`${title} 프로필 캐릭터`} fill sizes="44px" className="object-cover" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-stone-800">{userName} 님</p>
              <p className="mt-0.5 truncate text-[10px] text-stone-400">{title}</p>
            </div>
          </div>
        ) : (
          <p className="px-3 pb-2 text-xs text-stone-400">{userName} 님</p>
        )}
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
        <span className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-stone-900">
          {avatarUrl && (
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-stone-100 shadow-sm">
              <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
            </span>
          )}
          <span className="truncate">나눔플러스 · {title}</span>
        </span>
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
