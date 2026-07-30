"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check } from "lucide-react";

const field = "mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500";
const labelCls = "text-sm font-medium text-stone-700";

export function OrgSettingsForm({ initial }: {
  initial: {
    description: string; address: string; phone: string; email: string; logoUrl: string;
    bankName: string; bankAccount: string; bankHolder: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setDone(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/org/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(b?.error ?? "저장 중 문제가 발생했습니다.");
      return;
    }
    setDone(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
      <div>
        <label className={labelCls}>기관 소개</label>
        <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>대표 전화</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} />
        </div>
        <div>
          <label className={labelCls}>기관 이메일</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label className={labelCls}>주소</label>
        <input value={form.address} onChange={(e) => set("address", e.target.value)} className={field} />
      </div>
      <div>
        <label className={labelCls}>로고 이미지 URL</label>
        <input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." className={field} />
      </div>

      <div className="border-t border-stone-100 pt-4">
        <p className="text-sm font-semibold text-stone-900">정산 계좌</p>
        <p className="mt-0.5 text-xs text-stone-500">매월 16일 후원금 정산 시 입금될 계좌 정보입니다.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>은행명</label>
            <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
              placeholder="예: 국민은행" className={field} />
          </div>
          <div>
            <label className={labelCls}>계좌번호</label>
            <input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)}
              placeholder="000-00-000000" className={field} />
          </div>
          <div>
            <label className={labelCls}>예금주</label>
            <input value={form.bankHolder} onChange={(e) => set("bankHolder", e.target.value)}
              placeholder="기관명 또는 대표자명" className={field} />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
          변경 저장
        </button>
        {done && <span className="flex items-center gap-1 text-sm text-brand-600"><Check className="h-4 w-4" strokeWidth={1.75} /> 저장되었습니다</span>}
      </div>
    </form>
  );
}
