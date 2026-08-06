"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote, CheckCircle2, Clock3, AlertCircle, XCircle,
  RefreshCw, ChevronDown, Loader2, CalendarClock,
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

type Stats = {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  countPending: number;
  countProcessing: number;
};

const STATUS_CONFIG = {
  PENDING: { label: "정산 대기", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock3 },
  PROCESSING: { label: "처리 중", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle },
  COMPLETED: { label: "정산 완료", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  CANCELLED: { label: "취소", badge: "bg-stone-50 text-stone-500 border-stone-200", icon: XCircle },
};

export function SettlementManagerClient({
  settlements, organizations, periods, stats,
  defaultStatus, defaultOrgId, defaultPeriod,
}: {
  settlements: SettlementRow[];
  organizations: { id: string; name: string }[];
  periods: string[];
  stats: Stats;
  defaultStatus: string;
  defaultOrgId: string;
  defaultPeriod: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterStatus = defaultStatus;
  const filterOrgId = defaultOrgId;
  const filterPeriod = defaultPeriod;

  const buildQuery = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterOrgId) p.set("orgId", filterOrgId);
    if (filterPeriod) p.set("period", filterPeriod);
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    return `?${p.toString()}`;
  };

  const navigate = (params: Record<string, string>) => {
    startTransition(() => router.push(`/admin/settlements${buildQuery(params)}`));
  };

  // 정산 데이터 생성 (확인은 ConfirmDialog 트리거에서 처리)
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/settlements/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.ok) {
        alert(`정산 생성 완료: 신규 ${data.created}건, 갱신 ${data.updated}건 (후원 ${data.totalDonations}건 처리)`);
        router.refresh();
      } else {
        alert(data.error ?? "생성 중 오류가 발생했습니다.");
      }
    } finally {
      setGenerating(false);
    }
  };

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
        router.refresh();
      } else {
        alert(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* 요약 카드 */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Clock3} label="대기 중" sub={`${stats.countPending}건`} value={formatKRW(stats.totalPending)} color="amber" />
        <SummaryCard icon={AlertCircle} label="처리 중" sub={`${stats.countProcessing}건`} value={formatKRW(stats.totalProcessing)} color="blue" />
        <SummaryCard icon={CheckCircle2} label="완료 누계" sub="" value={formatKRW(stats.totalCompleted)} color="emerald" />
        <SummaryCard icon={Banknote} label="전체 정산 건" sub="" value={`${settlements.length}건`} color="brand" />
      </div>

      {/* 필터 + 액션 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* 상태 필터 */}
        {["", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map((s) => {
          const cfg = s ? STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] : null;
          return (
            <button
              key={s}
              onClick={() => navigate({ status: s })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filterStatus === s
                  ? "bg-brand-600 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {cfg ? cfg.label : "전체"}
            </button>
          );
        })}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* 기관 필터 */}
          <select
            value={filterOrgId}
            onChange={(e) => navigate({ orgId: e.target.value })}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 outline-none focus:border-brand-500"
          >
            <option value="">전체 기관</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          {/* 기간 필터 */}
          <select
            value={filterPeriod}
            onChange={(e) => navigate({ period: e.target.value })}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 outline-none focus:border-brand-500"
          >
            <option value="">전체 기간</option>
            {periods.map((p) => (
              <option key={p} value={p}>{p.replace("-", "년 ")}월</option>
            ))}
          </select>

          {/* 정산 데이터 생성 */}
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

      {isPending && (
        <div className="mb-4 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> 필터 적용 중...
        </div>
      )}

      {/* 정산 목록 */}
      {settlements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-20 text-center">
          <CalendarClock className="mb-3 h-10 w-10 text-stone-300" strokeWidth={1.5} />
          <p className="font-semibold text-stone-500">정산 내역이 없습니다</p>
          <p className="mt-1 text-sm text-stone-400">위의 &apos;정산 데이터 생성&apos; 버튼을 클릭하면 미처리 후원 건에 대한 정산이 생성됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => {
            const cfg = STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            const isExpanded = expandedId === s.id;
            const isProcessing = processingId === s.id;

            return (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
                {/* 메인 행 */}
                <div className="flex flex-wrap items-start gap-4 p-5">
                  {/* 왼쪽 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900">
                        {s.organization.name}
                      </span>
                      <span className="text-sm text-stone-500">
                        {s.period.replace("-", "년 ")}월 정산
                      </span>
                      <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                        <Icon className="h-3 w-3" strokeWidth={2} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        예정일: {fmtKst(s.scheduledDate, "yyyy년 M월 d일", { locale: ko })}
                      </span>
                      {s.processedAt && (
                        <span className="text-emerald-600">
                          완료: {fmtKst(s.processedAt, "yyyy년 M월 d일", { locale: ko })}
                        </span>
                      )}
                      <span>후원 {s.donationCount}건</span>
                    </div>
                    {/* 계좌 */}
                    {s.bankAccount && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" strokeWidth={1.75} />{s.bankName} {s.bankAccount} ({s.bankHolder})</span>
                      </div>
                    )}
                    {!s.bankAccount && s.organization.bankAccount && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {s.organization.bankName} {s.organization.bankAccount} ({s.organization.bankHolder})
                        </span>
                      </div>
                    )}
                    {!s.bankAccount && !s.organization.bankAccount && (
                      <p className="mt-2 text-xs text-amber-600">⚠ 계좌 미등록</p>
                    )}
                  </div>

                  {/* 오른쪽 금액 + 버튼 */}
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-brand-700">{formatKRW(s.netAmount)}</p>
                      {s.feeAmount > 0 && (
                        <p className="text-xs text-stone-400">수수료 {formatKRW(s.feeAmount)} 차감</p>
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

                {/* 확장 패널 — 처리 액션 */}
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
                          <ActionButton
                            label="처리 중으로 변경"
                            color="blue"
                            loading={isProcessing}
                            onClick={() => handleStatusChange(s.id, "PROCESSING")}
                          />
                        )}
                        {(s.status === "PENDING" || s.status === "PROCESSING") && (
                          <ActionButton
                            label="✓ 정산 완료 처리"
                            color="emerald"
                            loading={isProcessing}
                            onClick={() => handleStatusChange(s.id, "COMPLETED")}
                          />
                        )}
                        {s.status !== "COMPLETED" && s.status !== "CANCELLED" && (
                          <ActionButton
                            label="취소"
                            color="rose"
                            loading={isProcessing}
                            onClick={() => handleStatusChange(s.id, "CANCELLED")}
                          />
                        )}
                        {s.status === "COMPLETED" && (
                          <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                            완료됨
                          </span>
                        )}
                      </div>
                    </div>
                    {s.note && (
                      <p className="mt-2 text-xs text-stone-500">메모: {s.note}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SummaryCard({
  icon: Icon, label, sub, value, color,
}: {
  icon: typeof Clock3;
  label: string;
  sub: string;
  value: string;
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
      <p className="text-xs text-stone-500">{label} {sub && <span className="text-stone-400">{sub}</span>}</p>
      <p className="mt-1 text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}

function ActionButton({
  label, color, loading, onClick,
}: {
  label: string;
  color: "blue" | "emerald" | "rose";
  loading: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  const textColor = color === "rose" ? "" : "text-white";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${colorMap[color]} ${textColor} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : null}
      {label}
    </button>
  );
}
