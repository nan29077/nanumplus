"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Play, Plus } from "lucide-react";

interface Props {
  tableExists: boolean;
  unprocessed: number;
  suffix: string;
}

export function EmmaSetupPanel({ tableExists, unprocessed, suffix }: Props) {
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [insertState, setInsertState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [insertResult, setInsertResult] = useState<string | null>(null);
  const [cronState, setCronState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [currentTableExists, setCurrentTableExists] = useState(tableExists);
  const [currentUnprocessed, setCurrentUnprocessed] = useState(unprocessed);

  async function handleCreateTables() {
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/emma-setup?action=create-tables", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setCreateResult(`테이블 생성 완료: ${data.created.join(", ")}`);
        setCurrentTableExists(true);
      } else {
        setCreateResult(`오류: ${data.error}`);
      }
    } catch {
      setCreateResult("네트워크 오류");
    }
    setCreating(false);
  }

  async function handleInsertTestMo() {
    setInsertState("running");
    setInsertResult(null);
    const recipient = prompt("수신번호 (예: #25409300 — 여성신문사)\n기관배정 없음 테스트는 #25409999 입력", "#25409300");
    if (!recipient) { setInsertState("idle"); return; }
    const phone = prompt("발신번호 (후원자 전화번호)", "01012345678");
    const content = prompt("문자 내용", "화이팅");

    try {
      const res = await fetch("/api/admin/emma-setup?action=insert-test-mo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, phone, content }),
      });
      const data = await res.json();
      if (data.ok) {
        setInsertResult(`MO 삽입 완료 (${data.moKey}) — 크론을 실행해 처리하세요.`);
        setInsertState("done");
        setCurrentUnprocessed((n) => n + 1);
      } else {
        setInsertResult(`오류: ${data.error}`);
        setInsertState("error");
      }
    } catch {
      setInsertResult("네트워크 오류");
      setInsertState("error");
    }
    setTimeout(() => { setInsertState("idle"); }, 5000);
  }

  async function handleRunCron() {
    setCronState("running");
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/emma-mo");
      const data = await res.json();
      if (data.ok) {
        if (data.skipped) {
          setCronResult(`비활성 — ${data.reason}`);
        } else {
          setCronResult(`처리 ${data.processed}건 · 오류 ${data.errors}건`);
          setCurrentUnprocessed(0);
        }
        setCronState("done");
      } else {
        setCronResult(data.error ?? "실패");
        setCronState("error");
      }
    } catch {
      setCronResult("네트워크 오류");
      setCronState("error");
    }
    setTimeout(() => { setCronState("idle"); }, 5000);
  }

  return (
    <div className="space-y-3">
      {/* 테이블 상태 */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        currentTableExists
          ? "bg-emerald-50 border-emerald-100"
          : "bg-amber-50 border-amber-100"
      }`}>
        {currentTableExists
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" strokeWidth={2} />
          : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" strokeWidth={2} />
        }
        <div className="flex-1">
          {currentTableExists ? (
            <>
              <p className="text-sm font-semibold text-emerald-800">
                em_mo_log_{suffix} 연결됨
                {currentUnprocessed > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    미처리 {currentUnprocessed}건
                  </span>
                )}
              </p>
              <p className="text-xs text-emerald-600">EMMA 테이블이 준비되어 있습니다.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-amber-800">em_mo_log_{suffix} 없음</p>
              <p className="text-xs text-amber-600">
                EMMA 에이전트 미설치 또는 다른 DB 사용 중. 아래 버튼으로 테이블을 생성하세요.
              </p>
            </>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2">
        {!currentTableExists && (
          <button
            onClick={handleCreateTables}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            {creating ? "생성 중..." : "EMMA 테이블 생성"}
          </button>
        )}

        <button
          onClick={handleInsertTestMo}
          disabled={!currentTableExists || insertState === "running"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          테스트 MO 삽입
        </button>

        <button
          onClick={handleRunCron}
          disabled={cronState === "running"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 transition-colors"
        >
          {cronState === "running" ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : cronState === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
          ) : (
            <Play className="h-4 w-4" strokeWidth={1.75} />
          )}
          크론 즉시 실행
        </button>
      </div>

      {/* 결과 메시지 */}
      {createResult && (
        <p className="text-xs text-stone-600 px-1">{createResult}</p>
      )}
      {insertResult && (
        <p className={`text-xs px-1 ${insertState === "error" ? "text-red-500" : "text-stone-600"}`}>
          {insertResult}
        </p>
      )}
      {cronResult && (
        <p className={`text-xs px-1 ${cronState === "error" ? "text-red-500" : "text-stone-600"}`}>
          크론: {cronResult}
        </p>
      )}

      {/* EMMA 미설치 시 안내 */}
      {!currentTableExists && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">실서비스 EMMA 설치 방법</p>
          <p>1. <a href="https://www.ibizplus.co.kr/technical/datacenter" target="_blank" className="underline">인포뱅크 기술정보센터</a>에서 EMMA (PostgreSQL용) 다운로드</p>
          <p>2. 설치 시 DB: <code className="bg-blue-100 px-1 rounded">localhost:5432/donation_platform</code> (postgres/postgres) 입력</p>
          <p>3. EMMA ID: 인포뱅크에서 부여한 2자리 ID → .env <code className="bg-blue-100 px-1 rounded">EMMA_ID</code>에 동일하게 입력</p>
          <p>4. EMMA 실행 후 <code className="bg-blue-100 px-1 rounded">emma-cron.bat loop</code> 실행</p>
        </div>
      )}
    </div>
  );
}
