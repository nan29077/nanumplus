"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Check, AlertCircle, Loader2 } from "lucide-react";

const MAX_LEN = 2000;

/**
 * 기관 담당자 전용 내부 메모.
 * 후원자에게는 노출되지 않으며, 저장 시 감사 로그가 기록된다.
 */
export function DonorMemoForm({ donorId, initialMemo }: { donorId: string; initialMemo: string | null }) {
  const router = useRouter();
  const [memo, setMemo] = useState(initialMemo ?? "");
  const [saved, setSaved] = useState(initialMemo ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = memo !== saved;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !dirty) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch(`/api/org/donors/${donorId}/memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "메모 저장에 실패했습니다.");
        return;
      }
      const next = typeof data?.memo === "string" ? data.memo : memo;
      setMemo(next);
      setSaved(next);
      setDone(true);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-stone-800">담당자 메모</h2>
        <span className="text-[11px] text-stone-400">내부 전용 · 후원자에게 노출되지 않습니다</span>
      </div>

      <textarea
        value={memo}
        onChange={(e) => {
          setMemo(e.target.value.slice(0, MAX_LEN));
          setDone(false);
        }}
        rows={5}
        maxLength={MAX_LEN}
        placeholder="상담 이력, 감사 인사 발송 여부, 특이사항 등을 기록하세요."
        className="mt-3 w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700 outline-none placeholder:text-stone-400 focus:border-brand-500"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-400">
          {memo.length.toLocaleString("ko-KR")} / {MAX_LEN.toLocaleString("ko-KR")}자
        </p>
        <div className="flex items-center gap-2">
          {error && (
            <span className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> {error}
            </span>
          )}
          {done && !dirty && !error && (
            <span className="flex items-center gap-1 text-xs text-brand-700">
              <Check className="h-3.5 w-3.5" strokeWidth={1.75} /> 저장되었습니다
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={() => { setMemo(saved); setError(null); setDone(false); }}
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
            >
              되돌리기
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !dirty}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            메모 저장
          </button>
        </div>
      </div>
    </form>
  );
}
