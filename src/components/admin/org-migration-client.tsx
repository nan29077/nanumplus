"use client";

import { useState, useRef } from "react";
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  Loader2, Download, Info, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type PreviewRow = {
  rowNum: number;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  valid: boolean;
  error?: string;
};

type ImportResult = {
  ok?: boolean;
  created: number;
  skipped: number;
  errorCount: number;
  errors: { row: number; name: string; message: string }[];
};

export function OrgMigrationClient() {
  const fileRef = useRef<HTMLInputElement>(null);
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
      const XLSX = await import("xlsx");
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const rows: PreviewRow[] = raw.map((r, i) => {
        const rowNum = i + 2;
        const name = String(r["기관명"] ?? r["이름"] ?? r["name"] ?? "").trim();
        const description = String(r["설명"] ?? r["기관설명"] ?? r["description"] ?? "").trim();
        const phone = String(r["연락처"] ?? r["전화번호"] ?? r["phone"] ?? "").trim();
        const email = String(r["이메일"] ?? r["email"] ?? "").trim();
        const address = String(r["주소"] ?? r["address"] ?? "").trim();
        const bankName = String(r["은행명"] ?? r["은행"] ?? r["bankName"] ?? "").trim();
        const bankAccount = String(r["계좌번호"] ?? r["계좌"] ?? r["bankAccount"] ?? "").trim();
        const bankHolder = String(r["예금주"] ?? r["bankHolder"] ?? "").trim();

        let valid = true;
        let error = "";
        if (!name) { valid = false; error = "기관명 없음"; }

        return { rowNum, name, description, phone, email, address, bankName, bankAccount, bankHolder, valid, error };
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

  // 기관 일괄 등록 실행 (확인은 ConfirmDialog 트리거에서 처리)
  const handleImport = async () => {
    if (validRows.length === 0) return; // 버튼 disabled 조건과 동일한 안전 가드

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migration/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            name: r.name,
            description: r.description || undefined,
            phone: r.phone || undefined,
            email: r.email || undefined,
            address: r.address || undefined,
            bankName: r.bankName || undefined,
            bankAccount: r.bankAccount || undefined,
            bankHolder: r.bankHolder || undefined,
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
      "기관명,설명,연락처,이메일,주소,은행명,계좌번호,예금주",
      "행복복지관,서울시 강남구 복지기관,,welfare@example.com,서울시 강남구 테헤란로 123,국민은행,123-456-789012,행복복지관",
      "사랑나눔센터,,02-1234-5678,,경기도 성남시 분당구,,,"
    ].join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "기관목록_템플릿.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 안내 */}
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
            <p className="text-blue-700">동일한 기관명이 이미 존재하면 해당 행은 <b>건너뜁니다</b> (중복 방지).</p>
            <div className="overflow-x-auto rounded-xl bg-white/70 p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-blue-200">
                    {["열 이름", "예시", "필수 여부"].map((h) => (
                      <th key={h} className="pb-2 pr-6 text-left font-semibold text-blue-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {[
                    ["기관명", "행복복지관", "✅ 필수"],
                    ["설명", "서울시 강남구 복지기관", "선택"],
                    ["연락처", "02-1234-5678", "선택"],
                    ["이메일", "org@example.com", "선택"],
                    ["주소", "서울시 강남구 테헤란로 123", "선택"],
                    ["은행명", "국민은행", "선택"],
                    ["계좌번호", "123-456-789012", "선택"],
                    ["예금주", "행복복지관", "선택"],
                  ].map(([col, ex, req]) => (
                    <tr key={col}>
                      <td className="py-1.5 pr-6 font-medium">{col}</td>
                      <td className="py-1.5 pr-6 text-stone-500">{ex}</td>
                      <td className="py-1.5">{req}</td>
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

      {/* 파일 업로드 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <label className="text-sm font-medium text-stone-700">기관 목록 파일 *</label>
        <div
          className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-3 transition hover:border-brand-400 hover:bg-brand-50"
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
            <ConfirmDialog
              title="기관 일괄 등록"
              description={`${validRows.length}개 기관을 등록합니까? 이미 존재하는 기관명은 건너뜁니다.`}
              confirmLabel="등록"
              onConfirm={handleImport}
              trigger={
                <button
                  disabled={importing || validRows.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {importing
                    ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    : <Upload className="h-4 w-4" strokeWidth={1.75} />}
                  {importing ? "등록 중..." : `${validRows.length}개 기관 등록`}
                </button>
              }
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  {["행", "기관명", "연락처", "이메일", "주소", "계좌 정보", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {preview.slice(0, 100).map((r) => (
                  <tr key={r.rowNum} className={r.valid ? "" : "bg-rose-50"}>
                    <td className="px-4 py-2.5 text-stone-400">{r.rowNum}</td>
                    <td className="px-4 py-2.5 font-medium text-stone-800">{r.name || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.email || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500 max-w-[200px] truncate">{r.address || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">
                      {r.bankAccount ? `${r.bankName} ${r.bankAccount}` : "—"}
                    </td>
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
              <p className="font-semibold text-stone-900">기관 등록 완료</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-700">신규 등록 <b>{result.created}개</b></span>
                <span className="text-blue-700">중복 건너뜀 <b>{result.skipped}개</b></span>
                {result.errorCount > 0 && (
                  <span className="text-amber-700">처리 실패 <b>{result.errorCount}건</b></span>
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
                          {e.row}행 ({e.name}): {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="mt-3 text-sm text-stone-600">
                등록된 기관에 관리자 계정을 추가하려면{" "}
                <a href="/admin/organizations" className="font-medium text-brand-600 underline">기관 목록</a>에서
                직접 추가해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
