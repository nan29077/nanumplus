"use client";

import { useState } from "react";
import { Play, CheckCircle2, AlertCircle } from "lucide-react";

/** 관리자 페이지에서 EMMA MO 크론을 수동으로 1회 실행하는 버튼 */
export function EmmaRunCronButton() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);

  const handleRun = async () => {
    setState("running");
    setResult(null);
    try {
      const res = await fetch("/api/admin/emma-run-cron", { method: "GET" });
      const data = await res.json();
      if (data.ok) {
        if (data.skipped) {
          setResult("비활성 상태 (설정 확인 필요)");
        } else {
          setResult(`처리 ${data.processed}건 · 오류 ${data.errors}건`);
        }
        setState("done");
      } else {
        setResult(data.error ?? "실패");
        setState("error");
      }
    } catch {
      setResult("네트워크 오류");
      setState("error");
    }
    setTimeout(() => { setState("idle"); setResult(null); }, 5000);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRun}
        disabled={state === "running"}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 transition-colors"
      >
        {state === "running" ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : state === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
        ) : state === "error" ? (
          <AlertCircle className="h-4 w-4 text-red-400" strokeWidth={2} />
        ) : (
          <Play className="h-4 w-4" strokeWidth={1.75} />
        )}
        {state === "running" ? "실행 중..." : "지금 실행"}
      </button>
      {result && (
        <span className={`text-xs ${state === "error" ? "text-red-500" : "text-stone-500"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
