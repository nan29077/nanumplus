"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote, CheckCircle2, Clock3, AlertCircle, XCircle,
  RefreshCw, ChevronDown, Loader2, CalendarClock, BarChart3,
  List, TrendingUp, Building2, Play,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { ko } from "date-fns/locale";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SettlementRow = {
  id: string;
  period: string;
  scheduledDate: string;
  totalAmount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  processedAt: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  note: string | null;
  donationCount: number;
  organization: { id: string; name: string; bankName: string | null; bankAccount: string | null; bankHolder: string | null };
};

type MonthlyRow = {
  period: string;
  pending: number; processing: number; completed: number; cancelled: number;
  pendingAmt: number; processingAmt: number; completedAmt: number;
  orgCount: number; totalItems: number;
};

type Stats = {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  countPending: number;
  countProcessing: number;
  countCompleted: number;
};

const STATUS_CONFIG = {
  PENDING:    { label: "정산 대기", badge: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock3 },
  PROCESSING: { label: "처리 중",   badge: "bg-blue-50 text-blue-700 border-blue-200",      icon: AlertCircle },
  COMPLETED:  { label: "정산 완료", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  CANCELLED:  { label: "취소",      badge: "bg-stone-50 text-stone-500 border-stone-200",   icon: XCircle },
};

function formatPeriod(period: string) {
  const [y, m] = period.split("-");
  return `${y}년 ${parseInt(m)}월`;
}

export function AdminSettlementClient({
  settlements, organizations, periods, monthlyList, stats,
  defaultView, defaultStatus, defaultOrgId, defaultPeriod,
}: {
  settlements: SettlementRow[];
  organizations: { id: string; name: string }[];
  periods: string[];
  monthlyList: MonthlyRow[];
  stats: Stats;
  defaultView: string;
  defaultStatus: string;
  defaultOrgId: string;
  defaultPeriod: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessingPeriod, setBatchProcessingPeriod] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const view = defaultView === "list" ? "list" : "monthly";

  const navigate = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    if (defaultView !== "monthly") p.set("view", defaultView);
    if (defaultStatus) p.set("status", defaultStatus);
    if (defaultOrgId) p.set("orgId", defaultOrgId);
    if (defaultPeriod) p.set("period", defaultPeriod);
    Object.entries(params).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k);
    });
    startTransition(() => router.push(`/admin/settlements?${p.toString()}`));
  };

  // 정산 데이터 생성 (확인은 ConfirmDialog 트리거에서 처리)
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/settlements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`정산 생성 완료: 신규 ${data.created}건, 갱신 ${data.updated}건`);
        router.refresh();
      } else {
        alert(data.error ?? "생성 중 오류가 발생했습니다.");
      }
    } catch {
      alert("네트워크 오류로 정산 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGenerating(false);
    }
  };

  // 단건 상태 변경
  const handleStatusChange = async (id: string, status: string) => {
    const note = noteMap[id] ?? "";
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (data.ok) {
        // 서버의 최신 note가 화면에 반영되도록 로컬 입력값을 비운다 (stale state 방지)
        setNoteMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        router.refresh();
      } else {
        alert(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } catch {
      alert("네트워크 오류로 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setProcessingId(null);
    }
  };

  // 기간별 일괄 정산 완료 (확인은 ConfirmDialog 트리거에서 처리)
  const handleBatchComplete = async (period: string) => {
    const periodLabel = formatPeriod(period);
    setBatchProcessingPeriod(period);
    try {
      const targets = settlements.filter(
        (s) => s.period === period && (s.status === "PENDING" || s.status === "PROCESSING")
      );
      let success = 0;
      let failed = 0;
      for (const s of targets) {
        try {
          const res = await fetch(`/api/admin/settlements/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "COMPLETED", note: `일괄 정산 완료 처리 (${periodLabel})` }),
          });
          const data = await res.json();
          if (data.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }
      alert(
        `${periodLabel} 정산 ${success}건 완료 처리되었습니다.` +
          (failed > 0 ? ` (실패 ${failed}건 — 목록을 확인해 주세요)` : "")
      );
      router.refresh();
    } finally {
      setBatchProcessingPeriod(null);
    }
  };

  return (
    <>
      {/* 전체 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Clock3} label="정산 대기" sub={`${stats.countPending}건`} value={formatKRW(stats.totalPending)} color="amber" />
        <SummaryCard icon={AlertCircle} label="처리 중" sub={`${stats.countProcessing}건`} value={formatKRW(stats.totalProcessing)} color="blue" />
        <SummaryCard icon={CheckCircle2} label="완료 누계" sub={`${stats.countCompleted}건`} value={formatKRW(stats.totalCompleted)} color="emerald" />
        <SummaryCard icon={Banknote} label="전체 정산 건" sub="" value={`${settlements.length}건`} color="brand" />
      </div>

      {/* 뷰 전환 + 액션 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* 뷰 탭 */}
        <div className="flex rounded-xl border border-stone-200 bg-white p-1">
          <button
            onClick={() => navigate({ view: "monthly" })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "monthly"
                ? "bg-brand-600 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
            월별
          </button>
          <button
            onClick={() => navigate({ view: "list" })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-brand-600 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <List className="h-4 w-4" strokeWidth={1.75} />
            목록
          </button>
        </div>

        {/* 목록 뷰 필터 */}
        {view === "list" && (
          <>
            {["", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map((s) => {
              const cfg = s ? STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] : null;
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
            <select
              value={defaultOrgId}
              onChange={(e) => navigate({ orgId: e.target.value })}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 outline-none focus:border-brand-500"
            >
              <option value="">전체 기관</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <select
              value={defaultPeriod}
              onChange={(e) => navigate({ period: e.target.value })}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 outline-none focus:border-brand-500"
            >
              <option value="">전체 기간</option>
              {periods.map((p) => (
                <option key={p} value={p}>{formatPeriod(p)}</option>
              ))}
            </select>
          </>
        )}

        <div className="ml-auto">
          <ConfirmDialog
            title="정산 데이터 생성"
            description="미처리 후원 건에 대해 정산 데이터를 생성합니까?"
            confirmLabel="생성"
            onConfirm={handleGenerate}
            trigger={
              <button
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {generating
                  ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  : <RefreshCw className="h-4 w-4" strokeWidth={1.75} />}
                정산 데이터 생성
              </button>
            }
          />
        </div>
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
              const isBatchRunning = batchProcessingPeriod === m.period;

              return (
                <div key={m.period} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
                  {/* 월 헤더 */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-stone-100 bg-stone-50 px-6 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="h-5 w-5 text-brand-600" strokeWidth={1.75} />
                        <h3 className="text-base font-bold text-stone-900">{formatPeriod(m.period)}</h3>
                        <span className="text-xs text-stone-400">기관 {m.orgCount}곳 · 후원 {m.totalItems}건</span>
                      </div>
                    </div>

                    {/* 금액 요약 */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {m.pendingAmt > 0 && (
                        <span className="text-amber-700">
                          대기 <b>{formatKRW(m.pendingAmt)}</b>
                          <span className="ml-1 text-xs text-stone-400">({m.pending}건)</span>
                        </span>
                      )}
                      {m.processingAmt > 0 && (
                        <span className="text-blue-700">
                          처리중 <b>{formatKRW(m.processingAmt)}</b>
                          <span className="ml-1 text-xs text-stone-400">({m.processing}건)</span>
                        </span>
                      )}
                      {m.completedAmt > 0 && (
                        <span className="text-emerald-700">
                          완료 <b>{formatKRW(m.completedAmt)}</b>
                          <span className="ml-1 text-xs text-stone-400">({m.completed}건)</span>
                        </span>
                      )}
                    </div>

                    {/* 합계 + 일괄 버튼 */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-stone-400">월 합계</p>
                        <p className="text-lg font-bold text-stone-900">{formatKRW(totalAmt)}</p>
                      </div>
                      {!allDone ? (
                        <ConfirmDialog
                          title="일괄 정산 실행"
                          description={`${formatPeriod(m.period)} 정산 대기 건을 모두 완료 처리합니까?`}
                          confirmLabel="실행"
                          onConfirm={() => handleBatchComplete(m.period)}
                          trigger={
                            <button
                              disabled={isBatchRunning}
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isBatchRunning
                                ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                                : <Play className="h-4 w-4" strokeWidth={2} />}
                              일괄 정산 실행
                            </button>
                          }
                        />
                      ) : (
                        <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                          정산 완료
                        </span>
                      )}
                      <button
                        onClick={() => navigate({ view: "list", period: m.period })}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                      >
                        <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                        상세 보기
                      </button>
                    </div>
                  </div>

                  {/* 기관별 요약 (해당 월의 settlements) */}
                  <div className="divide-y divide-stone-100">
                    {settlements
                      .filter((s) => s.period === m.period)
                      .map((s) => {
                        const cfg = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
                        const Icon = cfg.icon;
                        return (
                          <div key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                            <Building2 className="h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
                            <span className="min-w-[120px] text-sm font-medium text-stone-800">
                              {s.organization.name}
                            </span>
                            <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                              <Icon className="h-3 w-3" strokeWidth={2} />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-stone-400">후원 {s.donationCount}건</span>
                            <span className="text-xs text-stone-400">
                              예정일: {fmtKst(s.scheduledDate, "M/d", { locale: ko })}
                            </span>
                            {(s.bankAccount || s.organization.bankAccount) && (
                              <span className="text-xs text-stone-400">
                                {s.bankName ?? s.organization.bankName} {s.bankAccount ?? s.organization.bankAccount}
                              </span>
                            )}
                            {!s.bankAccount && !s.organization.bankAccount && (
                              <span className="text-xs text-amber-600">⚠ 계좌 미등록</span>
                            )}
                            <span className="ml-auto font-semibold text-brand-700">{formatKRW(s.netAmount)}</span>

                            {/* 빠른 처리 버튼 */}
                            {s.status === "PENDING" && (
                              <button
                                onClick={() => handleStatusChange(s.id, "COMPLETED")}
                                disabled={processingId === s.id}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {processingId === s.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                                  : <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                                완료
                              </button>
                            )}
                            {s.status === "PROCESSING" && (
                              <button
                                onClick={() => handleStatusChange(s.id, "COMPLETED")}
                                disabled={processingId === s.id}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {processingId === s.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                                  : <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                                완료
                              </button>
                            )}
                          </div>
                        );
                      })}
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
              const isExpanded = expandedId === s.id;
              const isProcessing = processingId === s.id;

              return (
                <div key={s.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
                  <div className="flex flex-wrap items-start gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-stone-900">{s.organization.name}</span>
                        <span className="text-sm text-stone-500">{formatPeriod(s.period)}</span>
                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          <Icon className="h-3 w-3" strokeWidth={2} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                          예정일: {fmtKst(s.scheduledDate, "yyyy.M.d", { locale: ko })}
                        </span>
                        {s.processedAt && (
                          <span className="text-emerald-600">
                            완료: {fmtKst(s.processedAt, "yyyy.M.d", { locale: ko })}
                          </span>
                        )}
                        <span>후원 {s.donationCount}건</span>
                      </div>
                      {(s.bankAccount || s.organization.bankAccount) && (
                        <div className="mt-1.5 text-xs text-stone-500">
                          <Banknote className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
                          {s.bankName ?? s.organization.bankName}{" "}
                          {s.bankAccount ?? s.organization.bankAccount}{" "}
                          ({s.bankHolder ?? s.organization.bankHolder})
                        </div>
                      )}
                      {!s.bankAccount && !s.organization.bankAccount && (
                        <p className="mt-1.5 text-xs text-amber-600">⚠ 계좌 미등록</p>
                      )}
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="text-xl font-bold text-brand-700">{formatKRW(s.netAmount)}</p>
                        {s.feeAmount > 0 && (
                          <p className="text-xs text-stone-400">수수료 {formatKRW(s.feeAmount)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-stone-50"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-stone-100 bg-stone-50 p-5">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-48">
                          <label className="text-xs font-medium text-stone-600">처리 메모 (선택)</label>
                          <input
                            value={noteMap[s.id] ?? s.note ?? ""}
                            onChange={(e) => setNoteMap((m) => ({ ...m, [s.id]: e.target.value }))}
                            placeholder="이체 확인 번호, 비고 등"
                            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {s.status === "PENDING" && (
                            <ActionButton label="처리 중으로 변경" color="blue" loading={isProcessing} onClick={() => handleStatusChange(s.id, "PROCESSING")} />
                          )}
                          {(s.status === "PENDING" || s.status === "PROCESSING") && (
                            <ActionButton label="✓ 정산 완료" color="emerald" loading={isProcessing} onClick={() => handleStatusChange(s.id, "COMPLETED")} />
                          )}
                          {s.status !== "COMPLETED" && s.status !== "CANCELLED" && (
                            <ActionButton label="취소" color="rose" loading={isProcessing} onClick={() => handleStatusChange(s.id, "CANCELLED")} />
                          )}
                          {s.status === "COMPLETED" && (
                            <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> 완료됨
                            </span>
                          )}
                        </div>
                      </div>
                      {s.note && <p className="mt-2 text-xs text-stone-500">메모: {s.note}</p>}
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
      <p className="mt-1 text-sm text-stone-400">
        위의 &apos;정산 데이터 생성&apos; 버튼으로 미처리 후원 건의 정산을 생성해 주세요.
      </p>
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, sub, value, color,
}: {
  icon: typeof Clock3; label: string; sub: string; value: string;
  color: "amber" | "blue" | "emerald" | "brand";
}) {
  const colorMap = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-50 text-brand-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-xs text-stone-500">
        {label} {sub && <span className="text-stone-400">{sub}</span>}
      </p>
      <p className="mt-1 text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}

function ActionButton({
  label, color, loading, onClick,
}: {
  label: string; color: "blue" | "emerald" | "rose"; loading: boolean; onClick: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    rose: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${colorMap[color]} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : null}
      {label}
    </button>
  );
}
