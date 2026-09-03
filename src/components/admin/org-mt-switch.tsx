"use client";

/**
 * 기관별 감사 문자(MT) 설정 — 최고관리자 전용
 *
 * 정책
 *  - 발신번호는 기관마다 반드시 등록해야 한다. 공용 번호로 대신 나가지 않는다.
 *  - 발신번호가 없으면 스위치를 켤 수 없다. (켜도 발송되지 않아 혼란만 준다)
 *  - 전역 마스터가 꺼져 있으면 여기서 켜도 실제 발송은 일어나지 않는다 —
 *    그 사실을 화면에 그대로 보여줘서 "켰는데 왜 안 나가지"를 막는다.
 */

import { useState } from "react";
import { MessageSquare, Save, Power, Info, AlertTriangle, Phone } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";

type Props = {
  orgId: string;
  orgName: string;
  initialEnabled: boolean;
  initialSenderNumber: string | null;
  /** 전역 마스터 상태 — 안내 문구용 */
  globalEnabled: boolean;
};

/** 010-1234-5678 형태로 보기 좋게 */
const pretty = (v: string) => {
  const d = v.replace(/[^0-9]/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return v;
};

export function OrgMtSwitch({
  orgId,
  orgName,
  initialEnabled,
  initialSenderNumber,
  globalEnabled,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedSender, setSavedSender] = useState(initialSenderNumber ?? "");
  const [sender, setSender] = useState(initialSenderNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return false;
      }
      if (typeof data.organization?.smsMtEnabled === "boolean") {
        setEnabled(data.organization.smsMtEnabled);
      }
      if ("mtSenderNumber" in (data.organization ?? {})) {
        const v = data.organization.mtSenderNumber ?? "";
        setSavedSender(v);
        setSender(v);
      }
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (next: boolean) => {
    const ok = await call({ smsMtEnabled: next });
    if (ok) setSaved(next ? "이 기관의 감사 문자를 켰습니다." : "이 기관의 감사 문자를 껐습니다.");
  };

  const saveSender = async () => {
    const ok = await call({ mtSenderNumber: sender.trim() });
    if (ok) setSaved(sender.trim() ? "발신번호를 저장했습니다." : "발신번호를 지웠습니다.");
  };

  const hasSender = savedSender.trim().length > 0;
  const dirty = sender.trim() !== savedSender.trim();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <MessageSquare className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
            감사 문자 발송
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            이 기관에 문자후원이 들어오면 후원자에게 감사 문자를 보냅니다.
          </p>
        </div>
        {enabled ? <Badge tone="green">켜짐</Badge> : <Badge tone="gray">꺼짐</Badge>}
      </div>

      {/* 발송될 문구 미리보기 */}
      <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3">
        <p className="text-xs font-medium text-stone-400">발송될 문구</p>
        <p className="mt-1 text-sm text-stone-700">
          [{orgName}] 3,000원 후원 감사합니다.
        </p>
        <p className="mt-1.5 text-xs text-stone-400">
          기관명이 맨 앞에 표시됩니다. 기관명이 길면 문구가 잘리지 않도록 기관명만 줄여 보냅니다.
        </p>
      </div>

      {/* ── 발신번호 ── */}
      <div className="mt-5 border-t border-stone-100 pt-4">
        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
          <Phone className="h-3.5 w-3.5 text-stone-400" strokeWidth={1.75} />
          발신번호 <span className="text-rose-500">*</span>
        </label>

        <div className="mt-2 flex gap-2">
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="0212345678"
            inputMode="numeric"
            className="w-56 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <button
            onClick={saveSender}
            disabled={busy || !dirty}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            <Save className="h-4 w-4" strokeWidth={1.75} />
            저장
          </button>
          {hasSender && !dirty && (
            <span className="self-center text-sm text-stone-500">{pretty(savedSender)}</span>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
          <div>
            <b>발신번호 사전등록이 필요합니다.</b>
            <br />
            전기통신사업법에 따라, 문자 발신번호는 인포뱅크에 미리 등록된 번호만 사용할 수 있습니다.
            등록되지 않은 번호를 넣으면 발송이 거부됩니다. 해당 기관이 소유·이용 권한을 가진 번호로
            등록 절차를 마친 뒤 입력해 주세요.
            <br />
            후원자가 이 번호로 회신하거나 전화를 걸 수 있으므로, 기관이 응대 가능한 번호여야 합니다.
          </div>
        </div>
      </div>

      {/* ── 스위치 ── */}
      <div className="mt-5 border-t border-stone-100 pt-4">
        {!hasSender ? (
          <div className="flex items-start gap-2 rounded-xl bg-stone-50 p-3 text-sm text-stone-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" strokeWidth={1.75} />
            발신번호를 등록해야 감사 문자를 켤 수 있습니다.
          </div>
        ) : (
          <>
            {enabled && !globalEnabled && (
              <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                <span>
                  전역 마스터 스위치가 꺼져 있어 <b>실제로는 발송되지 않습니다.</b> 설정 → EMMA
                  문자후원 연동에서 마스터를 켜야 발송이 시작됩니다.
                </span>
              </div>
            )}

            {enabled ? (
              <button
                onClick={() => toggle(false)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                <Power className="h-4 w-4" strokeWidth={1.75} />
                끄기
              </button>
            ) : (
              <ConfirmDialog
                title="감사 문자를 켭니다"
                description={
                  globalEnabled
                    ? `${orgName} 에 문자후원이 들어오면 ${pretty(savedSender)} 번호로 후원자에게 즉시 감사 문자가 발송됩니다. 발송된 문자는 취소할 수 없습니다.`
                    : `${orgName} 의 스위치를 켭니다. 전역 마스터가 꺼져 있어 지금 당장 발송되지는 않지만, 마스터를 켜는 순간 이 기관도 발송 대상이 됩니다.`
                }
                confirmLabel="켜기"
                onConfirm={() => toggle(true)}
                trigger={
                  <button
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Power className="h-4 w-4" strokeWidth={1.75} />
                    켜기
                  </button>
                }
              />
            )}
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-brand-700">{saved}</p>}
    </div>
  );
}
