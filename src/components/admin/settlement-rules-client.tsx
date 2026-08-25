"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, CalendarClock } from "lucide-react";
import { CHANNEL_META, type DonationChannelKey } from "@/lib/donation-page";

export type SettlementRuleRow = {
  channel: DonationChannelKey;
  ruleType: "DAYS" | "MONTHS";
  offsetValue: number;
  anchorDay: number | null;
  isCustom?: boolean;
};

/** 오늘 후원 가정 시 정산예정일 미리보기 (KST 근사, 서버 로직과 동일 규칙) */
function previewDate(rule: SettlementRuleRow): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (rule.ruleType === "DAYS") {
    d.setDate(d.getDate() + Math.max(0, rule.offsetValue));
  } else {
    d.setMonth(d.getMonth() + Math.max(0, rule.offsetValue));
    d.setDate(Math.min(Math.max(rule.anchorDay ?? 16, 1), 28));
  }
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function ruleSummary(rule: SettlementRuleRow): string {
  if (rule.ruleType === "DAYS") return `후원일로부터 ${rule.offsetValue}일 후`;
  const m = rule.offsetValue === 1 ? "다음 달" : `${rule.offsetValue}개월 후`;
  return `${m} 매월 ${rule.anchorDay ?? 16}일`;
}

export function SettlementRulesClient({ initial }: { initial: SettlementRuleRow[] }) {
  const router = useRouter();
  const [rules, setRules] = useState<SettlementRuleRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<SettlementRuleRow>) => {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setDone(false);
  };

  const save = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/settlement-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((r) => ({
            channel: r.channel,
            ruleType: r.ruleType,
            offsetValue: r.offsetValue,
            anchorDay: r.ruleType === "MONTHS" ? (r.anchorDay ?? 16) : null,
          })),
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(b?.error ?? "저장 중 문제가 발생했습니다.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3.5 text-sm text-sky-800">
        채널별로 후원금이 기관에 정산되는 시점을 설정합니다. 저장 후 <b>새로 생성되는 정산</b>부터 적용됩니다.
        (이미 생성된 정산 예정일은 바뀌지 않습니다.)
      </div>

      {rules.map((r, i) => (
        <div key={r.channel} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-900">{CHANNEL_META[r.channel].label}</p>
              <p className="text-xs text-stone-400">{CHANNEL_META[r.channel].desc}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-500">
              <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
              오늘 후원 시 → <b className="text-stone-700">{previewDate(r)}</b> 정산
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <select
              value={r.ruleType}
              onChange={(e) => update(i, { ruleType: e.target.value as "DAYS" | "MONTHS" })}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
              <option value="MONTHS">개월 후 특정일</option>
              <option value="DAYS">후원일로부터 N일 후</option>
            </select>

            {r.ruleType === "DAYS" ? (
              <div className="flex items-center gap-1.5 text-sm text-stone-600">
                후원일 +
                <input type="number" min={0} max={365} value={r.offsetValue}
                  onChange={(e) => update(i, { offsetValue: Number(e.target.value) })}
                  className="w-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                일 후 정산
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-stone-600">
                <input type="number" min={0} max={24} value={r.offsetValue}
                  onChange={(e) => update(i, { offsetValue: Number(e.target.value) })}
                  className="w-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                개월 후 · 매월
                <input type="number" min={1} max={28} value={r.anchorDay ?? 16}
                  onChange={(e) => update(i, { anchorDay: Number(e.target.value) })}
                  className="w-20 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                일 정산
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-stone-400">현재 설정: {ruleSummary(r)}</p>
        </div>
      ))}

      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</p>}

      <div className="flex justify-end">
        <button onClick={save} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {busy ? "저장 중..." : done ? "저장됨" : "정산주기 저장"}
        </button>
      </div>
    </div>
  );
}
