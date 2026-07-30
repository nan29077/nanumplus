"use client";

import {
  LayoutDashboard, HandCoins, Users, MessageSquare, Landmark,
  RefreshCw, Megaphone, CalendarDays, BarChart3, QrCode, Settings, Wallet,
} from "lucide-react";
import { Sidebar, type NavSection } from "./sidebar";

const sections: NavSection[] = [
  { href: "/org/dashboard", label: "대시보드", icon: LayoutDashboard },

  {
    heading: "후원 관리",
    items: [
      { href: "/org/donations", label: "후원 내역", icon: HandCoins },
      { href: "/org/donors", label: "후원자 관리", icon: Users },
      { href: "/org/sms-donations", label: "문자후원", icon: MessageSquare },
      { href: "/org/easy-transfers", label: "간편 계좌이체", icon: Landmark },
      { href: "/org/recurring-transfers", label: "정기후원", icon: RefreshCw },
    ],
  },

  {
    heading: "캠페인 / 일정",
    items: [
      { href: "/org/campaigns", label: "모금 캠페인", icon: Megaphone },
      { href: "/org/calendar", label: "캘린더", icon: CalendarDays },
    ],
  },

  {
    heading: "정산",
    items: [
      { href: "/org/settlements", label: "정산 관리", icon: Wallet },
    ],
  },

  {
    heading: "분석 / 설정",
    items: [
      { href: "/org/reports", label: "통계 리포트", icon: BarChart3 },
      { href: "/org/qr-code", label: "QR 코드", icon: QrCode },
      { href: "/org/settings", label: "기관 설정", icon: Settings },
    ],
  },
];

export function OrgLayout({
  userName, orgName, children,
}: { userName: string; orgName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar sections={sections} title={orgName} userName={userName} logoHref="/" />
      <main className="px-4 py-6 lg:ml-64 lg:px-8">{children}</main>
    </div>
  );
}
