"use client";

/**
 * 감사 문자(MT) 전역 마스터 스위치 — 최고관리자 전용
 *
 * 이 스위치를 켜면 "기관 스위치가 켜진 기관"에 한해 감사 문자가 실제로 발송된다.
 * 발송된 문자는 취소할 수 없으므로, 켜기 전에 대상 기관 수를 확인시키고
 * 한 번 더 확인받는다. 끄는 것은 즉시 가능하다.
 */

import { useState } from "react";
import { Megaphone, AlertTriangle, Power, Info } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";

type Props = {
  initialEnabled: boolean;
  initialEnabledOrgs: number;
  initialTotalOrgs: number;
  /** PlatformSetting 테이블 미적용 상태 */
  unavailable: boolean;
};

export function MtGlobalSwitch({
  initialEnabled,
  initialEnabledOrgs,
  initialTotalOrgs,
  unavailable,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enabledOrgs, setEnabledOrgs] = useState(initialEnabledOrgs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return false;
      }
      setEnabled(!!data.config?.enabled);
      setEnabledOrgs(data.orgs?.enabled ?? enabledOrgs);
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (next: boolean) => {
    const ok = await call({ mtEnabled: next });
    if (ok) setSaved(next ? "발송을 시작했습니다." : "발송을 중단했습니다.");
  };

  if (unavailable) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.75} />
          <div>
            <h2 className="text-sm font-semibold text-amber-900">전역 설정 테이블이 아직 없습니다</h2>
            <p className="mt-1 text-sm text-amber-800">
              실서버에 <code className="rounded bg-amber-100 px-1">prisma/sync-prod-20260903-mt-switch.sql</code> 을
              적용한 뒤 앱을 재시작해 주세요. 적용 전까지 감사 문자는 발송되지 않습니다(안전).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Megaphone className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
            감사 문자 전역 마스터
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            이 스위치가 꺼져 있으면 기관 설정과 무관하게 감사 문자가 발송되지 않습니다.
          </p>
        </div>
        {enabled ? <Badge tone="green">발송 중</Badge> : <Badge tone="gray">중단</Badge>}
      </div>

      <div className="mt-5 rounded-xl bg-stone-50 p-4">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Info className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          기관 스위치가 켜진 기관{" "}
          <b className="text-stone-900">{enabledOrgs.toLocaleString("ko-KR")}</b>
          <span className="text-stone-400">/ 전체 {initialTotalOrgs.toLocaleString("ko-KR")}</span>
        </div>
        <p className="mt-1.5 text-xs text-stone-400">
          마스터를 켜면 위 {enabledOrgs.toLocaleString("ko-KR")}개 기관의 후원자에게 감사 문자가 나가기 시작합니다.
          발송된 문자는 취소할 수 없습니다.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {enabled ? (
          <button
            onClick={() => toggle(false)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <Power className="h-4 w-4" strokeWidth={1.75} />
            발송 중단
          </button>
        ) : (
          <ConfirmDialog
            title="감사 문자 발송을 시작합니다"
            description={`스위치가 켜진 ${enabledOrgs.toLocaleString("ko-KR")}개 기관의 후원자에게 감사 문자가 발송됩니다. 발송된 문자는 취소할 수 없습니다. 계속할까요?`}
            confirmLabel="발송 시작"
            onConfirm={() => toggle(true)}
            trigger={
              <button
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <Power className="h-4 w-4" strokeWidth={1.75} />
                발송 시작
              </button>
            }
          />
        )}
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <p className="text-xs font-medium text-stone-400">발신번호</p>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
          발신번호는 <b>기관별로 각각 등록</b>합니다. 공용 번호로 대신 발송되지 않으며,
          발신번호가 없는 기관은 마스터를 켜도 발송 대상에서 제외됩니다.
          <br />
          기관 관리 → 해당 기관 상세 화면에서 등록할 수 있습니다.
          (전기통신사업법상 인포뱅크에 사전등록된 번호만 사용 가능)
        </p>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-brand-700">{saved}</p>}
    </div>
  );
}
