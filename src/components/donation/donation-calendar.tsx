"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Landmark, RefreshCw } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn, formatKRW } from "@/lib/utils";
import { ChannelBadge, StatusBadge } from "@/components/ui/badge";

export type CalendarDayData = {
  date: string;
  total: number;
  sms: number;
  easy: number;
  recurring: number;
  count: number;
};

export type DayDonationRow = {
  id: string;
  amount: number;
  channel: string;
  status: string;
  donatedAt: string; // HH:mm
  donorName: string;
  organizationName?: string;
  campaignTitle?: string | null;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function DonationCalendar({
  year,
  month,
  days,
  selectedDate,
  dayDonations,
}: {
  year: number;
  month: number;
  days: CalendarDayData[];
  selectedDate?: string;
  dayDonations?: DayDonationRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [hover, setHover] = useState<string | null>(null);

  const go = (kv: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(kv).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    router.push(`${pathname}?${next.toString()}`);
  };

  const moveMonth = (delta: number) => {
    let y = year, m = month + delta;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    go({ year: String(y), month: String(m), date: null });
  };

  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells: (CalendarDayData | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900">
            {year}년 {month}월
          </h2>
          <div className="flex gap-1">
            <button onClick={() => moveMonth(-1)} aria-label="이전 달"
              className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button onClick={() => moveMonth(1)} aria-label="다음 달"
              className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50">
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn("py-1", i === 0 && "text-rose-400")}>{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) =>
            d === null ? (
              <div key={`e-${i}`} />
            ) : (
              <button
                key={d.date}
                onClick={() => go({ date: d.date })}
                onMouseEnter={() => setHover(d.date)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "min-h-[72px] rounded-xl border p-1.5 text-left transition",
                  selectedDate === d.date
                    ? "border-brand-500 bg-brand-50"
                    : d.total > 0
                      ? "border-stone-200 bg-white hover:border-brand-300"
                      : "border-transparent bg-stone-50/60 hover:bg-stone-100"
                )}
              >
                <span className="text-xs text-stone-500">{Number(d.date.slice(-2))}</span>
                {d.total > 0 && (
                  <>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-brand-700">
                      {d.total >= 10000
                        ? `${Math.round(d.total / 10000).toLocaleString("ko-KR")}만원`
                        : `${d.total.toLocaleString("ko-KR")}원`}
                    </p>
                    <div className="mt-1 flex gap-0.5">
                      {d.sms > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" title="문자후원" />}
                      {d.easy > 0 && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" title="간편 계좌이체" />}
                      {d.recurring > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="정기후원" />}
                    </div>
                  </>
                )}
                {hover === d.date && d.total > 0 && (
                  <span className="sr-only">{d.count}건 {formatKRW(d.total)}</span>
                )}
              </button>
            )
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> 문자후원</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> 간편 계좌이체</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> 정기후원</span>
        </div>
      </div>

      <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
        <h3 className="text-sm font-semibold text-stone-900">
          {selectedDate ? `${selectedDate} 후원 내역` : "날짜를 선택하세요"}
        </h3>
        {!selectedDate && (
          <p className="mt-2 text-sm text-stone-400">캘린더에서 날짜를 클릭하면 해당 날짜의 후원 상세 내역이 표시됩니다.</p>
        )}
        {selectedDate && (!dayDonations || dayDonations.length === 0) && (
          <p className="mt-2 text-sm text-stone-400">해당 날짜의 후원 내역이 없습니다.</p>
        )}
        {selectedDate && dayDonations && dayDonations.length > 0 && (
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {dayDonations.map((r) => (
              <li key={r.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-stone-900">{formatKRW(r.amount)}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
                  {r.channel === "SMS" && <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  {r.channel === "EASY_TRANSFER" && <Landmark className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  {r.channel === "RECURRING_TRANSFER" && <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  <ChannelBadge channel={r.channel} />
                  <span>· {r.donatedAt}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {r.donorName}
                  {r.organizationName && ` · ${r.organizationName}`}
                  {r.campaignTitle && ` · ${r.campaignTitle}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
