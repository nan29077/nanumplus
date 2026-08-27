import Link from "next/link";
import { ChevronRight, Phone, Mail, Link2 as LinkIcon, StickyNote } from "lucide-react";
import { formatKRW, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { DonorStatusKey } from "@/lib/donor-status";

export type DonorListRow = {
  id: string;
  name: string;
  /** 마스킹된 연락처 */
  phone: string;
  /** 마스킹된 이메일 */
  email: string;
  isLinked: boolean;
  hasMemo: boolean;
  firstDonatedAt: string | null;
  lastDonatedAt: string | null;
  donationCount: number;
  totalAmount: number;
  status: { key: DonorStatusKey; label: string; tone: "green" | "amber" | "gray" | "blue" };
  /** 활성 정기후원 월 금액 합계 (없으면 null) */
  recurringAmount: number | null;
  createdAt: string;
};

/**
 * 후원자 목록 표.
 * 모바일(<sm)에서는 카드 리스트, 태블릿 이상에서는 표로 렌더링한다.
 */
export function DonorListTable({ rows, emptyHint }: { rows: DonorListRow[]; emptyHint?: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="조건에 맞는 후원자가 없습니다"
        description={emptyHint ?? "검색어나 필터를 변경해 보세요. 후원이 등록되면 자동으로 표시됩니다."}
      />
    );
  }

  return (
    <>
      {/* 모바일 카드 */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((d) => (
          <li key={d.id}>
            <Link
              href={`/org/donors/${d.id}`}
              className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-card active:bg-stone-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-stone-900">
                    <span className="truncate">{d.name}</span>
                    {d.hasMemo && <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={1.75} />}
                    {d.isLinked && <LinkIcon className="h-3.5 w-3.5 shrink-0 text-violet-500" strokeWidth={1.75} />}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" strokeWidth={1.75} />
                    <span className="truncate">{d.phone}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{d.email}</span>
                  </p>
                </div>
                <Badge tone={d.status.tone}>{d.status.label}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
                <div>
                  <p className="text-[11px] text-stone-400">누적</p>
                  <p className="text-sm font-semibold text-stone-800">{formatKRW(d.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-400">횟수</p>
                  <p className="text-sm font-semibold text-stone-800">{formatNumber(d.donationCount)}건</p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-400">최근 후원</p>
                  <p className="text-sm font-semibold text-stone-800">{d.lastDonatedAt ?? "-"}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* 데스크톱 표 */}
      <div className="hidden sm:block">
        <DataTable
          headers={[
            "이름", "연락처", "첫 후원일", "최근 후원일", "후원 횟수", "누적 후원 금액", "상태", "",
          ]}
        >
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-stone-50/60">
              <td className="px-4 py-3">
                <Link href={`/org/donors/${d.id}`} className="font-medium text-stone-800 hover:text-brand-700">
                  <span className="inline-flex items-center gap-1.5">
                    {d.name}
                    {d.hasMemo && <StickyNote className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.75} />}
                    {d.isLinked && <LinkIcon className="h-3.5 w-3.5 text-violet-500" strokeWidth={1.75} />}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="text-stone-600">{d.phone}</p>
                <p className="text-xs text-stone-400">{d.email}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-stone-500">{d.firstDonatedAt ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-stone-500">{d.lastDonatedAt ?? "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-stone-500">{formatNumber(d.donationCount)}건</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-800">
                {formatKRW(d.totalAmount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={d.status.tone}>{d.status.label}</Badge>
                {d.recurringAmount ? (
                  <p className="mt-0.5 text-[11px] text-stone-400">월 {formatKRW(d.recurringAmount)}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/org/donors/${d.id}`}
                  aria-label={`${d.name} 상세 보기`}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50"
                >
                  상세 <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </>
  );
}
