"use client";

import { useMemo, useState } from "react";
import { Search, Download, X, Phone, Mail, StickyNote } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { maskPhone, maskEmail } from "@/lib/masking";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export type DonorRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isRecurring: boolean;
  memo: string | null;
  totalAmount: number;
  donationCount: number;
  lastDonatedAt: string | null;
  createdAt: string;
};

export function DonorTable({ donors, showCsv = true }: { donors: DonorRow[]; showCsv?: boolean }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<DonorRow | null>(null);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return donors;
    return donors.filter(
      (d) =>
        d.name.toLowerCase().includes(k) ||
        (d.phone ?? "").includes(k) ||
        (d.email ?? "").toLowerCase().includes(k)
    );
  }, [q, donors]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="이름·연락처·이메일 검색"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
        </div>
        {showCsv && (
          <a href="/api/org/donors/export"
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <Download className="h-4 w-4" strokeWidth={1.75} /> CSV 다운로드
          </a>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="후원자가 없습니다" description="검색 조건을 변경하거나 후원이 등록되면 표시됩니다." />
      ) : (
        <DataTable headers={["이름", "연락처", "이메일", "구분", "누적 후원액", "건수", "상세"]}>
          {filtered.map((d) => (
            <tr key={d.id} className="hover:bg-stone-50/60">
              <td className="px-4 py-3 font-medium text-stone-800">{d.name}</td>
              <td className="px-4 py-3 text-stone-500">{maskPhone(d.phone)}</td>
              <td className="px-4 py-3 text-stone-500">{maskEmail(d.email)}</td>
              <td className="px-4 py-3">
                {d.isRecurring ? <Badge tone="amber">정기후원자</Badge> : <Badge tone="gray">일반</Badge>}
              </td>
              <td className="px-4 py-3 font-semibold text-stone-800">{formatKRW(d.totalAmount)}</td>
              <td className="px-4 py-3 text-stone-500">{d.donationCount}건</td>
              <td className="px-4 py-3">
                <button onClick={() => setSelected(d)}
                  className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50">
                  보기
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-stone-900/40 sm:place-items-center" role="dialog" aria-modal>
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">{selected.name} 님</h2>
              <button onClick={() => setSelected(null)} aria-label="닫기"
                className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="h-4 w-4 text-stone-400" strokeWidth={1.75} /> {maskPhone(selected.phone)}
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <Mail className="h-4 w-4 text-stone-400" strokeWidth={1.75} /> {maskEmail(selected.email)}
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4">
                <div>
                  <p className="text-xs text-stone-400">누적 후원액</p>
                  <p className="mt-0.5 font-semibold text-brand-700">{formatKRW(selected.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">후원 건수</p>
                  <p className="mt-0.5 font-semibold text-stone-800">{selected.donationCount}건</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">최근 후원일</p>
                  <p className="mt-0.5 text-stone-700">{selected.lastDonatedAt ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400">등록일</p>
                  <p className="mt-0.5 text-stone-700">{selected.createdAt}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-stone-600">
                <StickyNote className="mt-0.5 h-4 w-4 text-stone-400" strokeWidth={1.75} />
                <p>{selected.memo || "메모가 없습니다."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
