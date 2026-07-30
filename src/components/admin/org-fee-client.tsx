"use client";

import { useState } from "react";
import { Percent, Save, Info } from "lucide-react";

const CHANNEL_LABELS: Record<string, string> = {
  SMS: "문자후원 (SMS)",
  EASY_TRANSFER: "간편 계좌이체",
  RECURRING_TRANSFER: "정기후원",
};

const CHANNEL_DESC: Record<string, string> = {
  SMS: "1건당 3,000원 고정",
  EASY_TRANSFER: "후원자 자유 금액",
  RECURRING_TRANSFER: "매월 자동이체",
};

type FeeRow = {
  channel: string;
  feePercent: number;
  isDefault: boolean;
};

export function OrgFeeClient({
  orgId,
  initialFees,
}: {
  orgId: string;
  initialFees: FeeRow[];
}) {
  const [fees, setFees] = useState<FeeRow[]>(initialFees);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (channel: string, value: string) => {
    const num = parseFloat(value);
    setFees((prev) =>
      prev.map((f) =>
        f.channel === channel
          ? { ...f, feePercent: isNaN(num) ? 0 : Math.min(100, Math.max(0, num)), isDefault: false }
          : f
      )
    );
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/fees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fees: fees.map((f) => ({ channel: f.channel, feePercent: f.feePercent })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장 실패");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Percent className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
            후원 채널별 수수료
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">수수료는 정산 생성 시 자동 차감됩니다.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" strokeWidth={1.75} />
        <p className="text-xs text-blue-700 leading-relaxed">
          설정된 수수료는 <b>정산 생성</b> 시 채널별로 적용됩니다.
          기존에 생성된 정산 데이터에는 소급 적용되지 않습니다.
        </p>
      </div>

      <div className="space-y-3">
        {fees.map((f) => (
          <div
            key={f.channel}
            className="flex items-center gap-4 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">{CHANNEL_LABELS[f.channel]}</p>
              <p className="text-xs text-stone-400">{CHANNEL_DESC[f.channel]}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={f.feePercent}
                  onChange={(e) => update(f.channel, e.target.value)}
                  className="w-20 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-right text-sm font-medium text-stone-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <span className="absolute right-3 text-sm text-stone-400 pointer-events-none">
                  %
                </span>
              </div>
              {f.isDefault && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-600">
                  기본값
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-stone-400">
          합계 예상 수수료율:{" "}
          <span className="font-semibold text-stone-600">
            SMS {fees.find((f) => f.channel === "SMS")?.feePercent ?? 5}% ·
            간편이체 {fees.find((f) => f.channel === "EASY_TRANSFER")?.feePercent ?? 5}% ·
            정기 {fees.find((f) => f.channel === "RECURRING_TRANSFER")?.feePercent ?? 5}%
          </span>
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : saved ? (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
          ) : (
            <Save className="h-4 w-4" strokeWidth={1.75} />
          )}
          {saving ? "저장 중..." : saved ? "저장됨" : "수수료 저장"}
        </button>
      </div>
    </div>
  );
}
