"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  trigger, title, description, confirmLabel = "삭제", onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          // 키보드 접근성: Enter/Space로도 다이얼로그를 열 수 있게 한다
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </span>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/40 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-3 text-base font-semibold text-stone-900">{title}</h3>
            <p className="mt-1 text-sm text-stone-500">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                onClick={() => setOpen(false)} disabled={busy}
              >
                취소
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={busy}
                onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); setOpen(false); }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
