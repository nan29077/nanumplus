"use client";

import {
  LayoutDashboard, Building2, HandCoins, Users, MessageSquare,
  Landmark, RefreshCw, Megaphone, CalendarDays, BarChart3,
  Settings, ScrollText, Wallet, DatabaseZap, Upload,
} from "lucide-react";
import { Sidebar, type NavSection } from "./sidebar";

const sections: NavSection[] = [
  // 단독 메뉴
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },

  // 기관 관리
  {
    heading: "기관 관리",
    items: [
      { href: "/admin/organizations", label: "기관 목록", icon: Building2 },
    ],
  },

  // 후원 관리
  {
    heading: "후원 관리",
    items: [
      { href: "/admin/donations", label: "전체 후원 내역", icon: HandCoins },
      { href: "/admin/donors", label: "후원자", icon: Users },
      { href: "/admin/sms-donations", label: "문자후원", icon: MessageSquare },
      { href: "/admin/transfers", label: "간편 계좌이체", icon: Landmark },
      { href: "/admin/recurring", label: "정기후원", icon: RefreshCw },
    ],
  },

  // 캠페인 / 일정
  {
    heading: "캠페인 / 일정",
    items: [
      { href: "/admin/campaigns", label: "캠페인", icon: Megaphone },
      { href: "/admin/calendar", label: "캘린더", icon: CalendarDays },
    ],
  },

  // 정산
  {
    heading: "정산",
    items: [
      { href: "/admin/settlements", label: "정산 관리", icon: Wallet },
    ],
  },

  // 데이터 / 시스템
  {
    heading: "데이터 / 시스템",
    items: [
      { href: "/admin/migration", label: "데이터 마이그레이션", icon: DatabaseZap },
      { href: "/admin/migration/organizations", label: "기관 업로드", icon: Upload },
      { href: "/admin/reports", label: "통계 리포트", icon: BarChart3 },
      { href: "/admin/audit-logs", label: "감사 로그", icon: ScrollText },
      { href: "/admin/settings", label: "설정", icon: Settings },
    ],
  },
];

export function AdminLayout({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar sections={sections} title="최고 관리자" userName={userName} logoHref="/" />
      <main className="px-4 py-6 lg:ml-64 lg:px-8">{children}</main>
    </div>
  );
}
