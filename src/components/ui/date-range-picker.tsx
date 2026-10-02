"use client";

/**
 * 기간 선택기 — 빠른 선택 버튼 + 시작일~종료일 달력
 *
 * 리포트 화면과 후원 내역 목록이 함께 쓴다.
 *  - 리포트: 인자 없이 <DateRangePicker /> — 기존 동작 그대로(기본 이번 달)
 *  - 목록:   presets 에 "all"·"thisWeek" 를 넣고 defaultPeriod="all"
 *
 * 기간을 바꾸면 쪽번호(page)는 1로 되돌린다. 3쪽을 보다가 기간을 줄이면
 * 3쪽이 비어 보이는 문제를 막기 위함이다.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  all: "전체",
  today: "오늘",
  thisWeek: "이번 주",
  "7d": "최근 7일",
  thisMonth: "이번 달",
  lastMonth: "지난 달",
  thisYear: "올해",
};

const DEFAULT_PRESETS = ["today", "7d", "thisMonth", "lastMonth", "thisYear"] as const;

export function DateRangePicker({
  presets = DEFAULT_PRESETS,
  defaultPeriod = "thisMonth",
}: {
  presets?: readonly string[];
  defaultPeriod?: string;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = params.get("period") ?? defaultPeriod;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const push = (next: URLSearchParams) => {
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const choosePreset = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    // 기본값과 같으면 주소에서 빼서 깔끔하게 둔다
    if (key === defaultPeriod) next.delete("period");
    else next.set("period", key);
    push(next);
  };

  const setCustom = (field: "from" | "to", value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(field, value);
    else next.delete(field);
    if (next.get("from") || next.get("to")) next.set("period", "custom");
    else next.delete("period");
    push(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1">
        {presets.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => choosePreset(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm",
              period === key
                ? "bg-brand-600 font-medium text-white"
                : "text-stone-600 hover:bg-stone-50"
            )}
          >
            {LABELS[key] ?? key}
          </button>
        ))}
      </div>
      {/* 다른 기간을 고르면 달력 입력을 다시 그려서 이전 날짜가 남아 보이지 않게 한다 */}
      <div
        key={`${period}|${from}|${to}`}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5",
          period === "custom" ? "border-brand-500" : "border-stone-200"
        )}
      >
        <CalendarRange className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
        <input
          type="date"
          aria-label="시작일"
          defaultValue={period === "custom" ? from : ""}
          max={to || undefined}
          onChange={(e) => setCustom("from", e.target.value)}
          className="bg-transparent text-sm text-stone-700 outline-none"
        />
        <span className="text-stone-300">~</span>
        <input
          type="date"
          aria-label="종료일"
          defaultValue={period === "custom" ? to : ""}
          min={from || undefined}
          onChange={(e) => setCustom("to", e.target.value)}
          className="bg-transparent text-sm text-stone-700 outline-none"
        />
      </div>
    </div>
  );
}
