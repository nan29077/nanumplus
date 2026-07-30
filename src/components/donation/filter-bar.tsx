"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

export function FilterBar({
  orgs,
  showChannel = true,
  showStatus = true,
}: {
  orgs?: Opt[];
  showChannel?: boolean;
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  const selCls = "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 outline-none focus:border-brand-500";
  const channels: Opt[] = [
    { value: "", label: "전체 채널" },
    { value: "SMS", label: "문자후원" },
    { value: "EASY_TRANSFER", label: "간편 계좌이체" },
    { value: "RECURRING_TRANSFER", label: "정기후원" },
  ];
  const statuses: Opt[] = [
    { value: "", label: "전체 상태" },
    { value: "COMPLETED", label: "완료" },
    { value: "PENDING", label: "대기" },
    { value: "FAILED", label: "실패" },
    { value: "CANCELLED", label: "취소" },
    { value: "REFUNDED", label: "환불" },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {orgs && (
        <select className={cn(selCls)} value={params.get("orgId") ?? ""} onChange={(e) => set("orgId", e.target.value)}>
          <option value="">전체 기관</option>
          {orgs.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {showChannel && (
        <select className={cn(selCls)} value={params.get("channel") ?? ""} onChange={(e) => set("channel", e.target.value)}>
          {channels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
      {showStatus && (
        <select className={cn(selCls)} value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}
    </div>
  );
}

export function Pagination({ total, page, pageSize }: { total: number; page: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  };

  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 2
  );

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      {nums.map((p, i) => {
        const gap = i > 0 && p - nums[i - 1] > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap && <span className="px-1 text-stone-300">…</span>}
            <button onClick={() => go(p)}
              className={cn(
                "h-8 min-w-8 rounded-lg px-2 text-sm",
                p === page ? "bg-brand-600 font-medium text-white" : "border border-stone-200 text-stone-600 hover:bg-stone-50"
              )}>
              {p}
            </button>
          </span>
        );
      })}
    </div>
  );
}
