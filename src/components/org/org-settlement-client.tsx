"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarClock, Banknote, CheckCircle2, Clock3, AlertCircle,
  XCircle, BarChart3, List, TrendingDown, TrendingUp,
} from "lucide-react";
import { ko } from "date-fns/locale";
import { formatKRW } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";

type SettlementRow = {
  id: string;
  period: string;
  scheduledDate: string;
  netAmount: number;
  feeAmount: number;
  totalAmount: number;
  status: string;
  processedAt: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  note: string | null;
  donationCount: number;
};

type MonthlyRow = {
  period: string;
  pendingAmt: number; completedAmt: number; processingAmt: number;
  pending: number; completed: number; processing: number; cancelled: number;
  totalItems: number;
};

const STATUS_CONFIG = {
  PENDING:    { label: "정산 대기", color: "bg-amber-50 text-amber-700 border-amber-200",      icon: Clock3 },
  PROCESSING: { label: "처리 중",   color: "bg-blue-50 text-blue-700 border-blue-200",         icon: AlertCircle },
  COMPLETED:  { label: "정산 완료", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  CANCELLED:  { label: "취소",      color: "bg-stone-50 text-stone-500 border-stone-200",       icon: XCircle },
};

function formatPeriod(period: string) {
  const [y, m] = period.split("-");
  return `${y}년 ${parseInt(m)}월`;
}

export function OrgSettlementClient({
  settlements, monthlyList, orgBank, stats,
  defaultView, defaultPeriod, defaultStatus,
}: {
  settlements: SettlementRow[];
  monthlyList: MonthlyRow[];
  orgBank: { name: string | null; account: string | null; holder: string | null };
  stats: { totalPending: number; totalCompleted: number; nextDate: string | null };
  defaultView: string;
  defaultPeriod: string;
  defaultStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const view = defaultView === "list" ? "list" : "monthly";

  const navigate = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    if (defaultView !== "monthly") p.set("view", defaultView);
    if (defaultPeriod) p.set("period", defaultPeriod);
    if (defaultStatus) p.set("status", defaultStatus);
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  };

  return (
    <>
      {/* 계좌 정보 배너 */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Banknote className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
          정산 계좌 정보
        </div>
        {orgBank.account ? (
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-stone-400">은행</p>
              <p className="font-medium text-stone-800">{orgBank.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">계좌번호</p>
              <p className="font-medium text-stone-800">{orgBank.account}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">예금주</p>
              <p className="font-medium text-stone-800">{orgBank.holder || "—"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-600">
            정산 계좌가 등록되지 않았습니다.{" "}
            <a href="/org/settings" className="underline font-medium">기관 설정</a>에서 등록해 주세요.
          </p>
        )}
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={TrendingDown}
          label="정산 예정 금액"
          value={formatKRW(stats.totalPending)}
          color="amber"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="누적 정산 완료"
          value={formatKRW(stats.totalCompleted)}
          color="emerald"
        />
        <SummaryCard
          icon={CalendarClock}
          label="다음 정산 예정일"
          value={
            stats.nextDate
              ? fmtKst(stats.nextDate, "M월 d일 (E)", { locale: ko })
              : "—"
          }
          color="brand"
        />
      </div>

      {/* 뷰 전환 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-stone-200 bg-white p-1">
          <button
            onClick={() => navigate({ view: "monthly" })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "monthly" ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
            월별
          </button>
          <button
            onClick={() => navigate({ view: "list" })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list" ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <List className="h-4 w-4" strokeWidth={1.75} />
            목록
          </button>
        </div>

        {/* 목록 뷰 상태 필터 */}
        {view === "list" && (
          <div className="flex flex-wrap gap-1.5">
            {(["", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const).map((s) => {
              const cfg = s ? STATUS_CONFIG[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => navigate({ status: s })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    defaultStatus === s
                      ? "bg-brand-600 text-white"
                      : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {cfg ? cfg.label : "전체"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 월별 뷰 ===== */}
      {view === "monthly" && (
        <div className="space-y-4">
          {monthlyList.length === 0 ? (
            <EmptyState />
          ) : (
            monthlyList.map((m) => {
              const totalAmt = m.pendingAmt + m.processingAmt + m.completedAmt;
              const allDone = m.pending === 0 && m.processing === 0;

              return (
                <div key={m.period} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
                  {/* 월 헤더 */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 bg-stone-50 px-6 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="h-5 w-5 text-brand-600" strokeWidth={1.75} />
                        <h3 className="text-base font-bold text-stone-900">{formatPeriod(m.period)}</h3>
                        <span className="text-xs text-stone-400">후원 {m.totalItems}건</span>
                      </div>
                    </div>

                    {/* 금액 요약 */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {m.pendingAmt > 0 && (
                        <span className="text-amber-700">
                          예정 <b>{formatKRW(m.pendingAmt)}</b>
                        </span>
                      )}
                      {m.processingAmt > 0 && (
                        <span className="text-blue-700">
                          처리중 <b>{formatKRW(m.processingAmt)}</b>
                        </span>
                      )}
                      {m.completedAmt > 0 && (
                        <span className="text-emerald-700">
                          완료 <b>{formatKRW(m.completedAmt)}</b>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-stone-400">월 합계</p>
                        <p className="text-lg font-bold text-stone-900">{formatKRW(totalAmt)}</p>
                      </div>
                      {allDone && (
                        <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                          완료
                        </span>
                      )}
                      <button
                        onClick={() => navigate({ view: "list", period: m.period })}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                      >
                        <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                        내역 보기
                      </button>
                    </div>
                  </div>

                  {/* 상태별 현황 */}
                  <div className="flex flex-wrap gap-4 px-6 py-4 text-sm">
                    {[
                      { label: "대기", count: m.pending, amt: m.pendingAmt, color: "text-amber-700" },
                      { label: "처리중", count: m.processing, amt: m.processingAmt, color: "text-blue-700" },
                      { label: "완료", count: m.completed, amt: m.completedAmt, color: "text-emerald-700" },
                      { label: "취소", count: m.cancelled, amt: 0, color: "text-stone-500" },
                    ].filter((item) => item.count > 0).map((item) => (
                      <div key={item.label} className={`${item.color}`}>
                        <span className="font-medium">{item.label}</span>
                        <span className="ml-1 text-xs">({item.count}건{item.amt > 0 ? ` · ${formatKRW(item.amt)}` : ""})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== 목록 뷰 ===== */}
      {view === "list" && (
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <EmptyState />
          ) : (
            settlements.map((s) => {
              const cfg = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
              const Icon = cfg.icon;
              return (
                <div key={s.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-stone-900">
                          {formatPeriod(s.period)} 정산
                        </span>
                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <Icon className="h-3 w-3" strokeWidth={2} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                          정산 예정일: {fmtKst(s.scheduledDate, "yyyy년 M월 d일", { locale: ko })}
                        </span>
                        {s.processedAt && (
                          <span className="text-emerald-600">
                            완료: {fmtKst(s.processedAt, "yyyy년 M월 d일", { locale: ko })}
                          </span>
                        )}
                        <span>후원 {s.donationCount}건</span>
                      </div>
                      {s.feeAmount > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-stone-50 border border-stone-100 px-3 py-2 text-xs">
                          <span className="text-stone-500">후원 합계 <b className="text-stone-700">{formatKRW(s.totalAmount)}</b></span>
                          <span className="text-red-500">수수료 <b>-{formatKRW(s.feeAmount)}</b></span>
                          <span className="text-emerald-600 font-semibold">지급 예정 {formatKRW(s.netAmount)}</span>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-stone-50 border border-stone-100 px-3 py-2 text-xs">
                          <span className="text-stone-500">후원 합계 <b className="text-stone-700">{formatKRW(s.totalAmount)}</b></span>
                          <span className="text-emerald-600 font-semibold">지급 예정 {formatKRW(s.netAmount)}</span>
                        </div>
                      )}
                      {s.note && (
                        <p className="mt-1.5 text-xs text-stone-500">메모: {s.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-brand-700">{formatKRW(s.netAmount)}</p>
                    </div>
                  </div>

                  {/* 계좌 정보 (정산별로 다를 경우) */}
                  {s.bankAccount && (
                    <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-stone-50 px-4 py-2.5 text-xs text-stone-600">
                      <span>은행: <b>{s.bankName}</b></span>
                      <span>계좌: <b>{s.bankAccount}</b></span>
                      <span>예금주: <b>{s.bankHolder}</b></span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-20 text-center">
      <CalendarClock className="mb-3 h-10 w-10 text-stone-300" strokeWidth={1.5} />
      <p className="font-semibold text-stone-500">정산 내역이 없습니다</p>
      <p className="mt-1 text-sm text-stone-400">후원이 완료되면 자동으로 정산 일정이 생성됩니다.</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, color,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  color: "amber" | "emerald" | "brand";
}) {
  const colorMap = {
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-50 text-brand-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}
