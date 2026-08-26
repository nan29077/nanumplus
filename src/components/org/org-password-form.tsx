"use client";

import { useState } from "react";
import { KeyRound, Loader2, Check } from "lucide-react";

const field = "mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500";
const labelCls = "text-sm font-medium text-stone-700";

export function OrgPasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (next.length < 8) { setError("새 비밀번호는 8자 이상이어야 합니다."); return; }
    if (next !== confirm) { setError("새 비밀번호가 일치하지 않습니다."); return; }
    if (current === next) { setError("새 비밀번호가 현재 비밀번호와 동일합니다."); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/org/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(b?.error ?? "비밀번호 변경 중 문제가 발생했습니다.");
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("네트워크 오류로 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 max-w-2xl space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <KeyRound className="h-4 w-4 text-brand-500" strokeWidth={1.75} /> 비밀번호 변경
        </p>
        <p className="mt-0.5 text-xs text-stone-500">로그인 비밀번호를 직접 변경할 수 있습니다. (8자 이상)</p>
      </div>

      <div>
        <label className={labelCls}>현재 비밀번호</label>
        <input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setDone(false); }}
          autoComplete="current-password" className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>새 비밀번호</label>
          <input type="password" value={next} onChange={(e) => { setNext(e.target.value); setDone(false); }}
            autoComplete="new-password" className={field} />
        </div>
        <div>
          <label className={labelCls}>새 비밀번호 확인</label>
          <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setDone(false); }}
            autoComplete="new-password" className={field} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <KeyRound className="h-4 w-4" strokeWidth={1.75} />}
          비밀번호 변경
        </button>
        {done && <span className="flex items-center gap-1 text-sm text-brand-600"><Check className="h-4 w-4" strokeWidth={1.75} /> 변경되었습니다</span>}
      </div>
    </form>
  );
}
