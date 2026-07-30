"use client";

import { useState } from "react";
import { Database, Building2 } from "lucide-react";
import { ExcelMigrationClient } from "./excel-migration-client";
import { OrgMigrationClient } from "./org-migration-client";

type Org = { id: string; name: string };

const TABS = [
  {
    id: "donations" as const,
    label: "후원 데이터 업로드",
    icon: Database,
    description: "기존 시스템의 후원 내역을 엑셀로 일괄 가져옵니다.",
  },
  {
    id: "organizations" as const,
    label: "기관 목록 업로드",
    icon: Building2,
    description: "이전 시스템의 기관 목록을 엑셀로 일괄 등록합니다.",
  },
];

type TabId = (typeof TABS)[number]["id"];

export function MigrationTabsClient({ organizations }: { organizations: Org[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("donations");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="mb-5 flex gap-1.5 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-card">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 설명 */}
      <p className="mb-6 text-sm text-stone-500">{current.description}</p>

      {/* 컨텐츠 */}
      {activeTab === "donations" && <ExcelMigrationClient organizations={organizations} />}
      {activeTab === "organizations" && <OrgMigrationClient />}
    </div>
  );
}
