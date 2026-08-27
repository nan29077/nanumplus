"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Download, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DONOR_TYPES, DONOR_STATUSES, DONOR_PERIODS, DONOR_SORTS,
  DONOR_TYPE_LABELS, DONOR_STATUS_LABELS, DONOR_PERIOD_LABELS, DONOR_SORT_LABELS,
} from "@/lib/donor-filter-options";

const selCls =
  "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 outline-none focus:border-brand-500";

/**
 * 후원자 목록 검색·필터·정렬 바.
 * 모든 조건은 URL 쿼리스트링에 반영되어 새로고침·뒤로가기·공유가 가능하다.
 */
export function DonorFilters({ exportHref }: { exportHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const qParam = params.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const [openMore, setOpenMore] = useState(false);
  // 외부(뒤로가기 등)에서 q가 바뀌면 입력값도 동기화
  const lastPushed = useRef(qParam);

  useEffect(() => {
    if (qParam !== lastPushed.current) {
      lastPushed.current = qParam;
      setQ(qParam);
    }
  }, [qParam]);

  const push = (kv: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(kv)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // 조건이 바뀌면 항상 1페이지부터
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  // 검색어 디바운스 (400ms) — 타이핑 중 매 글자 라우팅하지 않는다
  useEffect(() => {
    if (q === qParam) return;
    const t = setTimeout(() => {
      lastPushed.current = q;
      push({ q });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const period = params.get("period") ?? "all";
  const hasFilter =
    !!qParam ||
    ["type", "status", "period", "sort", "from", "to"].some((k) => !!params.get(k));

  const reset = () => {
    setQ("");
    lastPushed.current = "";
    startTransition(() => router.push(pathname));
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lastPushed.current = q;
            push({ q });
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 sm:flex-none"
        >
          <Search className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·이메일·전화번호 검색"
            aria-label="후원자 검색"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400 sm:w-56"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="검색어 지우기"
              className="shrink-0 text-stone-300 hover:text-stone-500"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setOpenMore((v) => !v)}
          aria-expanded={openMore}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium sm:hidden",
            openMore ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-200 bg-white text-stone-600"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} /> 필터
        </button>

        <div className="ml-auto flex items-center gap-2">
          {hasFilter && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">초기화</span>
            </button>
          )}
          {exportHref && (
            <a
              href={exportHref}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">CSV 다운로드</span>
            </a>
          )}
        </div>
      </div>

      <div className={cn("flex-wrap gap-2", openMore ? "flex" : "hidden sm:flex")}>
        <select
          className={selCls} aria-label="후원 유형"
          value={params.get("type") ?? "all"}
          onChange={(e) => push({ type: e.target.value === "all" ? "" : e.target.value })}
        >
          {DONOR_TYPES.map((t) => (
            <option key={t} value={t}>{DONOR_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          className={selCls} aria-label="후원 상태"
          value={params.get("status") ?? "all"}
          onChange={(e) => push({ status: e.target.value === "all" ? "" : e.target.value })}
        >
          {DONOR_STATUSES.map((s) => (
            <option key={s} value={s}>{DONOR_STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          className={selCls} aria-label="후원 기간"
          value={period}
          onChange={(e) =>
            push(
              e.target.value === "all"
                ? { period: "", from: "", to: "" }
                : { period: e.target.value }
            )
          }
        >
          {DONOR_PERIODS.map((p) => (
            <option key={p} value={p}>{DONOR_PERIOD_LABELS[p]}</option>
          ))}
        </select>

        {period === "custom" && (
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5">
            <input
              type="date" aria-label="시작일"
              defaultValue={params.get("from") ?? ""}
              onChange={(e) => push({ period: "custom", from: e.target.value })}
              className="bg-transparent text-sm text-stone-700 outline-none"
            />
            <span className="text-stone-300">~</span>
            <input
              type="date" aria-label="종료일"
              defaultValue={params.get("to") ?? ""}
              onChange={(e) => push({ period: "custom", to: e.target.value })}
              className="bg-transparent text-sm text-stone-700 outline-none"
            />
          </div>
        )}

        <select
          className={cn(selCls, "sm:ml-auto")} aria-label="정렬 기준"
          value={params.get("sort") ?? "recent"}
          onChange={(e) => push({ sort: e.target.value === "recent" ? "" : e.target.value })}
        >
          {DONOR_SORTS.map((s) => (
            <option key={s} value={s}>{DONOR_SORT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {pending && <p className="text-xs text-stone-400">불러오는 중...</p>}
    </div>
  );
}
