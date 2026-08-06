"use client";

import { useState, useRef } from "react";
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  Loader2, Download, Info, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Org = { id: string; name: string };

type PreviewRow = {
  rowNum: number;
  donorName: string;
  phone: string;
  email: string;
  memo: string;
  channel: string;
  amount: number;
  donatedAt: string;
  status: string;
  valid: boolean;
  error?: string;
};

type ImportResult = {
  ok?: boolean;
  donorCreated: number;
  donorExisting: number;
  donationCreated: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

const CHANNEL_MAP: Record<string, string> = {
  "문자후원": "SMS",
  "sms": "SMS",
  "간편계좌이체": "EASY_TRANSFER",
  "간편 계좌이체": "EASY_TRANSFER",
  "easy_transfer": "EASY_TRANSFER",
  "정기후원": "RECURRING_TRANSFER",
  "recurring_transfer": "RECURRING_TRANSFER",
};

const CHANNEL_LABEL: Record<string, string> = {
  SMS: "문자후원",
  EASY_TRANSFER: "간편 계좌이체",
  RECURRING_TRANSFER: "정기후원",
};

function normalizeChannel(raw: string): string {
  const key = raw?.toString().trim().toLowerCase();
  return CHANNEL_MAP[key] ?? raw?.toString().trim().toUpperCase();
}

function normalizeDate(raw: unknown): string {
  if (!raw) return "";
  // Excel serial number
  if (typeof raw === "number") {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const match = s.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return s;
}

export function ExcelMigrationClient({ organizations }: { organizations: Org[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [orgId, setOrgId] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setLoading(true);

    try {
      // xlsx를 동적 import (클라이언트 전용)
      const XLSX = await import("xlsx");
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const rows: PreviewRow[] = raw.map((r, i) => {
        const rowNum = i + 2;
        const donorName = String(r["후원자명"] ?? r["이름"] ?? r["name"] ?? "").trim();
        const phone = String(r["전화번호"] ?? r["연락처"] ?? r["phone"] ?? "").trim();
        const email = String(r["이메일"] ?? r["email"] ?? "").trim();
        const memo = String(r["메모"] ?? r["비고"] ?? r["memo"] ?? "").trim();
        const channelRaw = String(r["채널"] ?? r["후원채널"] ?? r["channel"] ?? "").trim();
        const channel = normalizeChannel(channelRaw);
        const amount = Number(r["금액"] ?? r["후원금액"] ?? r["amount"] ?? 0);
        const donatedAt = normalizeDate(r["후원일"] ?? r["후원일시"] ?? r["날짜"] ?? r["donatedAt"] ?? "");
        const statusRaw = String(r["상태"] ?? r["status"] ?? "완료").trim();
        const statusMap: Record<string, string> = {
          "완료": "COMPLETED", "completed": "COMPLETED",
          "대기": "PENDING", "pending": "PENDING",
          "실패": "FAILED", "failed": "FAILED",
        };
        const status = statusMap[statusRaw.toLowerCase()] ?? "COMPLETED";

        const VALID_CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
        let valid = true;
        let error = "";
        if (!donorName) { valid = false; error = "후원자명 없음"; }
        else if (!VALID_CHANNELS.includes(channel)) { valid = false; error = `채널 오류: ${channelRaw}`; }
        else if (!amount || amount <= 0) { valid = false; error = `금액 오류: ${r["금액"] ?? r["후원금액"]}`; }
        else if (!donatedAt || isNaN(new Date(donatedAt).getTime())) { valid = false; error = `날짜 오류: ${donatedAt}`; }

        return { rowNum, donorName, phone, email, memo, channel, amount, donatedAt, status, valid, error };
      });

      setPreview(rows);
    } catch (err) {
      alert(`파일 파싱 오류: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const validRows = preview.filter((r) => r.valid);
  const invalidRows = preview.filter((r) => !r.valid);

  // 가져오기 실행 (확인은 ConfirmDialog 트리거에서 처리)
  const handleImport = async () => {
    if (!orgId || validRows.length === 0) return; // 버튼 disabled 조건과 동일한 안전 가드

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          rows: validRows.map((r) => ({
            donorName: r.donorName,
            phone: r.phone || undefined,
            email: r.email || undefined,
            memo: r.memo || undefined,
            channel: r.channel,
            amount: r.amount,
            donatedAt: r.donatedAt,
            status: r.status,
          })),
        }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.ok !== false) {
        setPreview([]);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setPreview([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csvContent = [
      "후원자명,전화번호,이메일,메모,채널,금액,후원일,상태",
      "홍길동,010-1234-5678,hong@email.com,,문자후원,3000,2024-01-05,완료",
      "김영희,010-9876-5432,,,간편 계좌이체,50000,2024-01-10,완료",
      "이철수,,,,정기후원,10000,2024-01-15,완료",
    ].join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "마이그레이션_템플릿.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 안내 섹션 */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Info className="h-4 w-4" strokeWidth={1.75} />
            엑셀 업로드 형식 안내
          </div>
          {showGuide
            ? <ChevronUp className="h-4 w-4 text-blue-600" strokeWidth={2} />
            : <ChevronDown className="h-4 w-4 text-blue-600" strokeWidth={2} />}
        </button>
        {showGuide && (
          <div className="mt-4 space-y-3 text-sm text-blue-800">
            <p>엑셀(.xlsx, .xls) 또는 CSV 파일을 업로드해 주세요. 첫 번째 행은 <b>헤더</b>여야 합니다.</p>
            <div className="overflow-x-auto rounded-xl bg-white/70 p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-blue-200">
                    {["열 이름", "예시", "필수 여부", "설명"].map((h) => (
                      <th key={h} className="pb-2 pr-6 text-left font-semibold text-blue-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {[
                    ["후원자명", "홍길동", "✅ 필수", ""],
                    ["전화번호", "010-1234-5678", "선택", "중복 체크 기준"],
                    ["이메일", "hong@email.com", "선택", ""],
                    ["메모", "VIP 후원자", "선택", ""],
                    ["채널", "문자후원", "✅ 필수", "문자후원 / 간편 계좌이체 / 정기후원"],
                    ["금액", "3000", "✅ 필수", "숫자만 입력"],
                    ["후원일", "2024-01-05", "✅ 필수", "YYYY-MM-DD"],
                    ["상태", "완료", "선택", "완료(기본) / 대기 / 실패"],
                  ].map(([col, ex, req, desc]) => (
                    <tr key={col}>
                      <td className="py-1.5 pr-6 font-medium">{col}</td>
                      <td className="py-1.5 pr-6 text-stone-500">{ex}</td>
                      <td className="py-1.5 pr-6">{req}</td>
                      <td className="py-1.5 text-stone-500">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              템플릿 CSV 다운로드
            </button>
          </div>
        )}
      </div>

      {/* 업로드 폼 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* 기관 선택 */}
          <div>
            <label className="text-sm font-medium text-stone-700">대상 기관 *</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            >
              <option value="">기관을 선택해 주세요</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* 파일 업로드 */}
          <div>
            <label className="text-sm font-medium text-stone-700">엑셀 파일 *</label>
            <div
              className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-2.5 transition hover:border-brand-400 hover:bg-brand-50"
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-stone-400" strokeWidth={1.5} />
              <span className="truncate text-sm text-stone-500">
                {fileName || "파일 선택 (xlsx, xls, csv)"}
              </span>
              {fileName && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="ml-auto text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" strokeWidth={1.75} />
          <span className="text-sm text-stone-600">파일 분석 중...</span>
        </div>
      )}

      {/* 미리보기 */}
      {preview.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4">
            <div>
              <h2 className="font-semibold text-stone-900">데이터 미리보기</h2>
              <p className="mt-0.5 text-sm text-stone-500">
                총 {preview.length}행 —
                <span className="ml-1 text-emerald-600">유효 {validRows.length}건</span>
                {invalidRows.length > 0 && (
                  <span className="ml-1 text-rose-600">오류 {invalidRows.length}건</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="text-stone-400">예상 후원 총액</p>
                <p className="font-bold text-brand-700">
                  {formatKRW(validRows.reduce((s, r) => s + r.amount, 0))}
                </p>
              </div>
              <ConfirmDialog
                title="후원 데이터 가져오기"
                description={`${validRows.length}건의 후원 데이터를 가져옵니까? 이 작업은 취소할 수 없습니다.`}
                confirmLabel="가져오기"
                onConfirm={handleImport}
                trigger={
                  <button
                    disabled={importing || !orgId || validRows.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {importing
                      ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                      : <Upload className="h-4 w-4" strokeWidth={1.75} />}
                    {importing ? "가져오는 중..." : `${validRows.length}건 가져오기`}
                  </button>
                }
              />
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  {["행", "후원자명", "전화번호", "채널", "금액", "후원일", "상태", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {preview.slice(0, 100).map((r) => (
                  <tr key={r.rowNum} className={r.valid ? "" : "bg-rose-50"}>
                    <td className="px-4 py-2.5 text-stone-400">{r.rowNum}</td>
                    <td className="px-4 py-2.5 font-medium text-stone-800">{r.donorName || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        r.channel === "SMS" ? "bg-sky-50 text-sky-700" :
                        r.channel === "EASY_TRANSFER" ? "bg-brand-50 text-brand-700" :
                        r.channel === "RECURRING_TRANSFER" ? "bg-amber-50 text-amber-700" :
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {CHANNEL_LABEL[r.channel] ?? r.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-stone-800">{r.amount ? formatKRW(r.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.donatedAt || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">{r.status}</td>
                    <td className="px-4 py-2.5">
                      {r.valid
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                        : (
                          <span className="flex items-center gap-1 text-xs text-rose-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                            {r.error}
                          </span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 100 && (
              <p className="px-4 py-3 text-center text-sm text-stone-400">
                처음 100행만 표시됩니다. 전체 {preview.length}행이 업로드됩니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className={`rounded-2xl border p-6 shadow-card ${
          result.errorCount === 0
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
            <div>
              <p className="font-semibold text-stone-900">마이그레이션 완료</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-700">
                  후원 내역 <b>{result.donationCreated}건</b> 등록
                </span>
                <span className="text-blue-700">
                  신규 후원자 <b>{result.donorCreated}명</b> 생성
                </span>
                <span className="text-stone-600">
                  기존 후원자 <b>{result.donorExisting}명</b> 연결
                </span>
                {result.errorCount > 0 && (
                  <span className="text-amber-700">
                    처리 실패 <b>{result.errorCount}건</b>
                  </span>
                )}
              </div>

              {result.errors?.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-1 text-sm font-medium text-amber-700"
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
                    오류 상세 보기 ({result.errors.length}건)
                  </button>
                  {showErrors && (
                    <ul className="mt-2 space-y-1">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-rose-700">
                          {e.row}행: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
