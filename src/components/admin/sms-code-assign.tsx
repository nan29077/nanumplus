"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Hash, Check } from "lucide-react";

export function SmsCodeAssign({
  orgId, currentCode,
}: { orgId: string; currentCode: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState(currentCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!/^\d{4}$/.test(code)) { setError("4"); return; }
    setBusy(true);
    setError("");
    setDone(false);
    const res = await fetch(`/api/admin/organizations/${orgId}/sms-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(b?.error ?? "Error");
      return;
    }
    setDone(true);
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-600">
          <Hash className="h-4 w-4" strokeWidth={1.75} />2540-
        </span>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setDone(false); }}
          placeholder="1234" inputMode="numeric"
          className="w-32 rounded-xl border border-stone-200 px-3 py-2.5 text-sm tracking-widest outline-none focus:border-brand-500"
        />
        <button onClick={submit} disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : done ? <Check className="h-4 w-4" strokeWidth={1.75} /> : null}
          {currentCode ? "Change" : "Assign"}
        </button>
        {code.length === 4 && (
          <span className="text-sm text-stone-500">Full number: <b className="text-brand-700">#2540-{code}</b></span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {done && <p className="mt-2 text-sm text-brand-600">SMS number assigned.</p>}
    </div>
  );
}
