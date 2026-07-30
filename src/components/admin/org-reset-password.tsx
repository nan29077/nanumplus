"use client";

import { useState } from "react";
import { KeyRound, X, Check } from "lucide-react";

export function OrgResetPassword({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setError(null);
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "초기화 실패"); return; }
      setDone(true);
      setPassword("");
      setConfirm("");
      setTimeout(() => { setOpen(false); setDone(false); }, 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-stone-900">기관 관리자 비밀번호</h2>
        <p className="mt-1 text-sm text-stone-500">기관 관리자의 로그인 비밀번호를 초기화합니다.</p>
        <div className="mt-4">
          <button
            onClick={() => { setOpen(true); setDone(false); setError(null); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            <KeyRound className="h-4 w-4" strokeWidth={1.75} /> 비밀번호 초기화
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900">비밀번호 초기화</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center py-6 text-emerald-600">
                <Check className="h-10 w-10 mb-2" strokeWidth={2} />
                <p className="font-medium">비밀번호가 초기화되었습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">새 비밀번호 (8자 이상)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">
                    취소
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? "처리 중..." : "초기화"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
