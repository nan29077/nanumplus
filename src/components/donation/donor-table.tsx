"use client";

import { useMemo, useState } from "react";
import { Search, Download, X, Phone, Mail, StickyNote, Link2 as LinkIcon } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { maskPhone, maskEmail } from "@/lib/masking";
import { Badge, ChannelBadge, StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CHANNEL_META, type DonationChannelKey } from "@/lib/donation-page";

export type DonorRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isRecurring: boolean;
  isLinked?: boolean;
  memo: string | null;
  totalAmount: number;
  donationCount: number;
  activeRecurring?: number;
  lastDonatedAt: string | null;
  createdAt: string;
  channels?: Record<string, number>;
  recent?: { amount: number; channel: string; status: string; date: string }[];
};

type Filter = "all" | "recurring" | "linked";

export function DonorTable({ donors, showCsv = true }: { donors: DonorRow[]; showCsv?: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<DonorRow | null>(null);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return donors.filter((d) => {
      if (filter === "recurring" && !d.isRecurring) return false;
      if (filter === "linked" && !d.isLinked) return false;
      if (!k) return true;
      return (
        d.name.toLowerCase().includes(k) ||
        (d.phone ?? "").includes(k) ||
        (d.email ?? "").toLowerCase().includes(k)
      );
    });
  }, [q, donors, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "recurring", label: "정기후원자" },
    { key: "linked", label: "간편로그인 연동" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="이름·연락처·이메일 검색"
              className="w-52 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex gap-1">
            {chips.map((c) => (
              <button key={c.key} onClick={() => setFilter(c.key)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium " +
                  (filter === c.key ? "bg-brand-600 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50")
                }>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {showCsv && (
          <a href="/api/org/donors/export"
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <Download className="h-4 w-4" strokeWidth={1.75} /> CSV 다운로드
          </a>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="후원자가 없습니다" description="검색·필터 조건을 변경하거나 후원이 등록되면 표시됩니다." />
      ) : (
        <DataTable headers={["이름", "연락처", "구분", "누적 후원액", "건수", "최근 후원", "상세"]}>
          {filtered.map((d) => (
            <tr key={d.id} className="hover:bg-stone-50/60">
              <td className="px-4 py-3 font-medium text-stone-800">{d.name}</td>
              <td className="px-4 py-3 text-stone-500">{maskPhone(d.phone)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {d.isRecurring ? <Badge tone="amber">정기</Badge> : <Badge tone="gray">일반</Badge>}
                  {d.isLinked && <Badge tone="violet">간편로그인</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-stone-800">{formatKRW(d.totalAmount)}</td>
              <td className="px-4 py-3 text-stone-500">{d.donationCount}건</td>
              <td className="px-4 py-3 text-stone-500">{d.lastDonatedAt ?? "-"}</td>
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
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">{selected.name} 님</h2>
                {selected.isRecurring && <Badge tone="amber">정기</Badge>}
                {selected.isLinked && <Badge tone="violet">간편로그인</Badge>}
              </div>
              <button onClick={() => setSelected(null)} aria-label="닫기"
                className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-stone-600">
                <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-stone-400" strokeWidth={1.75} /> {maskPhone(selected.phone)}</span>
                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-stone-400" strokeWidth={1.75} /> {maskEmail(selected.email)}</span>
                {selected.isLinked && <span className="flex items-center gap-1.5 text-violet-600"><LinkIcon className="h-4 w-4" strokeWidth={1.75} /> 후원자 계정 연동됨</span>}
              </div>

              {/* 요약 */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "누적", value: formatKRW(selected.totalAmount) },
                  { label: "건수", value: `${selected.donationCount}건` },
                  { label: "정기", value: `${selected.activeRecurring ?? 0}건` },
                  { label: "최근", value: selected.lastDonatedAt ?? "-" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-stone-50 p-3 text-center">
                    <p className="text-[11px] text-stone-400">{s.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* 채널 분포 */}
              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">채널별 후원 건수</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(CHANNEL_META) as DonationChannelKey[]).map((ch) => (
                    <div key={ch} className="rounded-xl border border-stone-100 p-2.5 text-center">
                      <p className="text-[11px] text-stone-400">{CHANNEL_META[ch].short}</p>
                      <p className="mt-0.5 text-sm font-semibold text-stone-800">{selected.channels?.[ch] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 후원 타임라인 */}
              <div>
                <p className="mb-2 text-xs font-semibold text-stone-500">최근 후원 내역</p>
                {(selected.recent ?? []).length === 0 ? (
                  <p className="rounded-xl bg-stone-50 py-4 text-center text-xs text-stone-400">후원 내역이 없습니다.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(selected.recent ?? []).map((r, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl border border-stone-100 px-3 py-2">
                        <span className="flex items-center gap-2">
                          <ChannelBadge channel={r.channel} />
                          <span className="text-xs text-stone-400">{r.date}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-800">{formatKRW(r.amount)}</span>
                          <StatusBadge status={r.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 메모 */}
              <div className="flex items-start gap-2 text-stone-600">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
                <p>{selected.memo || "메모가 없습니다."}</p>
              </div>
              <p className="text-right text-[11px] text-stone-400">등록일 {selected.createdAt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
