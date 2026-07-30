"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare, Landmark, RefreshCw, ExternalLink } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { todayKst } from "@/lib/kst-date";

export type CalendarDayData = {
  date: string; // yyyy-MM-dd
  total: number;
  sms: number;
  easy: number;
  recurring: number;
  count: number;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getHeatColor(total: number, maxTotal: number): string {
  if (total === 0 || maxTotal === 0) return "";
  const ratio = total / maxTotal;
  if (ratio >= 0.8) return "bg-brand-600 text-white";
  if (ratio >= 0.5) return "bg-brand-400 text-white";
  if (ratio >= 0.25) return "bg-brand-200 text-brand-900";
  return "bg-brand-50 text-brand-700";
}

export function DashboardCalendar({
  year,
  month,
  days,
  calendarHref,
}: {
  year: number;
  month: number;
  days: CalendarDayData[];
  calendarHref: string; // 전체 캘린더 페이지 링크
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const moveMonth = (delta: number) => {
    let y = year, m = month + delta;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    const next = new URLSearchParams(params.toString());
    next.set("calYear", String(y));
    next.set("calMonth", String(m));
    next.delete("calDate");
    router.push(`${pathname}?${next.toString()}`);
    setSelectedDate(null);
  };

  const maxTotal = Math.max(...days.map((d) => d.total), 1);
  const firstDow = new Date(year, month - 1, 1).getDay();
  const cells: (CalendarDayData | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  const selected = selectedDate ? days.find((d) => d.date === selectedDate) : null;
  const today = todayKst(); // yyyy-MM-dd (KST 기준)

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">
          {year}년 {month}월 후원 캘린더
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => moveMonth(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={() => moveMonth(1)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
          >
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <a
            href={calendarHref}
            className="ml-1 flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-50"
          >
            전체 보기 <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-1 text-[11px] font-semibold",
              i === 0 ? "text-rose-400" : i === 6 ? "text-sky-500" : "text-stone-400"
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {cells.map((d, i) =>
          d === null ? (
            <div key={`e-${i}`} />
          ) : (
            <button
              key={d.date}
              onClick={() => setSelectedDate(selectedDate === d.date ? null : d.date)}
              className={cn(
                "group relative min-h-[54px] rounded-lg p-1.5 text-left transition-all",
                selectedDate === d.date
                  ? "ring-2 ring-brand-500 ring-offset-1"
                  : "",
                d.total > 0
                  ? cn("cursor-pointer", getHeatColor(d.total, maxTotal))
                  : "bg-stone-50 text-stone-300 hover:bg-stone-100",
                today === d.date && d.total === 0
                  ? "bg-brand-50 text-brand-600"
                  : ""
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium",
                  today === d.date ? "underline underline-offset-1" : ""
                )}
              >
                {Number(d.date.slice(-2))}
              </span>
              {d.total > 0 && (
                <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight">
                  {d.total >= 1000000
                    ? `${Math.round(d.total / 10000)}만`
                    : d.total >= 10000
                      ? `${Math.round(d.total / 10000)}만`
                      : `${d.total.toLocaleString("ko-KR")}`}
                </p>
              )}
              {d.count > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {d.sms > 0 && <span className="h-1 w-1 rounded-full bg-sky-300" />}
                  {d.easy > 0 && <span className="h-1 w-1 rounded-full bg-white/70" />}
                  {d.recurring > 0 && <span className="h-1 w-1 rounded-full bg-amber-300" />}
                </div>
              )}
            </button>
          )
        )}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 text-[11px] text-stone-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-300" />문자</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-300" />계좌이체</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300" />정기</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-brand-50" />
          <span className="h-3 w-3 rounded bg-brand-200" />
          <span className="h-3 w-3 rounded bg-brand-400" />
          <span className="h-3 w-3 rounded bg-brand-600" />
          <span>후원 규모</span>
        </span>
      </div>

      {/* 선택된 날짜 상세 */}
      {selected && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs font-semibold text-brand-800">
            {selected.date} — 총 {selected.count}건 · {formatKRW(selected.total)}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
                <MessageSquare className="h-3 w-3" strokeWidth={2} />문자
              </div>
              <p className="mt-0.5 text-sm font-bold text-stone-900">
                {selected.sms > 0 ? formatKRW(selected.sms) : "-"}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
                <Landmark className="h-3 w-3" strokeWidth={2} />계좌이체
              </div>
              <p className="mt-0.5 text-sm font-bold text-stone-900">
                {selected.easy > 0 ? formatKRW(selected.easy) : "-"}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
                <RefreshCw className="h-3 w-3" strokeWidth={2} />정기
              </div>
              <p className="mt-0.5 text-sm font-bold text-stone-900">
                {selected.recurring > 0 ? formatKRW(selected.recurring) : "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
