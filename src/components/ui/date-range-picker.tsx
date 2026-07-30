"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const presets = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "최근 7일" },
  { key: "thisMonth", label: "이번 달" },
  { key: "lastMonth", label: "지난 달" },
  { key: "thisYear", label: "올해" },
] as const;

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const period = params.get("period") ?? "thisMonth";

  const set = (kv: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(kv).forEach(([k, v]) => next.set(k, v));
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => set({ period: p.key })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm",
              period === p.key
                ? "bg-brand-600 font-medium text-white"
                : "text-stone-600 hover:bg-stone-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5">
        <CalendarRange className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
        <input
          type="date" aria-label="시작일"
          defaultValue={params.get("from") ?? ""}
          onChange={(e) => set({ period: "custom", from: e.target.value })}
          className="bg-transparent text-sm text-stone-700 outline-none"
        />
        <span className="text-stone-300">~</span>
        <input
          type="date" aria-label="종료일"
          defaultValue={params.get("to") ?? ""}
          onChange={(e) => set({ period: "custom", to: e.target.value })}
          className="bg-transparent text-sm text-stone-700 outline-none"
        />
      </div>
    </div>
  );
}
