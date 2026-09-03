"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Building2, ChevronRight, Percent, X, Check, Loader2, MessageSquare } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export type OrgListItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  smsFullNumber: string | null;
  phone: string | null;
  loginId: string | null;
  isActive: boolean;
  /** 감사 문자(MT) 기관별 스위치 */
  smsMtEnabled: boolean;
  donorCount: number;
  campaignCount: number;
  total: number;
};

const CHANNELS = [
  { key: "SMS", label: "문자후원 (SMS)" },
  { key: "EASY_TRANSFER", label: "간편 계좌이체" },
  { key: "RECURRING_TRANSFER", label: "정기후원 (계좌)" },
  { key: "RECURRING_CARD", label: "정기후원 (카드)" },
] as const;

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, "");

export function OrgListClient({ orgs }: { orgs: OrgListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  /** 감사 문자가 켜진 기관만 보기 — 173개 중 몇 곳이 켜져 있는지 즉시 확인하기 위함 */
  const [mtOnly, setMtOnly] = useState(false);
  const mtEnabledCount = useMemo(() => orgs.filter((o) => o.smsMtEnabled).length, [orgs]);

  // 수수료 일괄 입력
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    SMS: true,
    EASY_TRANSFER: true,
    RECURRING_TRANSFER: true,
    RECURRING_CARD: true,
  });
  const [percent, setPercent] = useState<Record<string, string>>({
    SMS: "5",
    EASY_TRANSFER: "5",
    RECURRING_TRANSFER: "5",
    RECURRING_CARD: "5",
  });
  const [saving, setSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkDone, setBulkDone] = useState("");

  const filtered = useMemo(() => {
    const base = mtOnly ? orgs.filter((o) => o.smsMtEnabled) : orgs;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    const qDigits = onlyDigits(q);
    return base.filter((o) => {
      const name = o.name.toLowerCase();
      const loginId = (o.loginId ?? "").toLowerCase();
      const phone = o.phone ?? "";
      return (
        name.includes(q) ||
        loginId.includes(q) ||
        phone.toLowerCase().includes(q) ||
        (qDigits.length > 0 && onlyDigits(phone).includes(qDigits))
      );
    });
  }, [orgs, query, mtOnly]);

  const toggleOne = (id: string) => {
    setBulkDone("");
    setBulkError("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const toggleAllFiltered = () => {
    setBulkDone("");
    setBulkError("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((o) => next.delete(o.id));
      else filtered.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const applyBulkFees = async () => {
    setBulkError("");
    setBulkDone("");

    const ids = Array.from(selected);
    if (ids.length === 0) {
      setBulkError("수수료를 적용할 기관을 선택해 주세요.");
      return;
    }
    const fees = CHANNELS.filter((c) => enabled[c.key]).map((c) => ({
      channel: c.key,
      feePercent: parseFloat(percent[c.key]),
    }));
    if (fees.length === 0) {
      setBulkError("적용할 채널을 하나 이상 선택해 주세요.");
      return;
    }
    if (fees.some((f) => isNaN(f.feePercent) || f.feePercent < 0 || f.feePercent > 100)) {
      setBulkError("수수료율은 0 ~ 100 사이의 숫자로 입력해 주세요.");
      return;
    }
    const summary = fees.map((f) => `${CHANNELS.find((c) => c.key === f.channel)!.label} ${f.feePercent}%`).join(", ");
    if (!window.confirm(`${ids.length}개 기관에 다음 수수료를 적용합니다.\n\n${summary}\n\n계속하시겠습니까?`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/organizations/fees/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationIds: ids, fees }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBulkError(data?.error ?? "수수료 일괄 적용에 실패했습니다.");
        return;
      }
      setBulkDone(`${data?.updatedOrganizations ?? ids.length}개 기관에 수수료를 적용했습니다.`);
      setSelected(new Set());
      router.refresh();
    } catch {
      setBulkError("네트워크 오류로 수수료 적용에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="로그인 ID · 기관명 · 전화번호로 검색"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm text-stone-700 outline-none placeholder:text-stone-400 focus:border-brand-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMtOnly((v) => !v)}
          aria-pressed={mtOnly}
          title="감사 문자 발송이 켜진 기관만 보기"
          className={
            mtOnly
              ? "flex items-center gap-1.5 rounded-xl border border-brand-500 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700"
              : "flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          }
        >
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          감사문자 켜짐
          <span className={mtOnly ? "text-brand-600" : "text-stone-400"}>
            {mtEnabledCount}/{orgs.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setBulkOpen((v) => !v); setBulkError(""); setBulkDone(""); }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            bulkOpen
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          }`}
        >
          <Percent className="h-4 w-4" strokeWidth={1.75} /> 수수료 일괄 입력
        </button>
      </div>

      <p className="mb-3 text-xs text-stone-400">
        전체 {orgs.length}곳 중 <b className="text-stone-600">{filtered.length}곳</b> 표시
        {bulkOpen && selected.size > 0 && <> · 선택 <b className="text-brand-600">{selected.size}곳</b></>}
      </p>

      {bulkOpen && (
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <Percent className="h-4 w-4 text-brand-500" strokeWidth={1.75} /> 수수료 일괄 입력
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                선택한 기관의 채널별 수수료를 한 번에 저장합니다. 정산 생성 시부터 적용됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAllFiltered}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              {allFilteredSelected ? "검색 결과 전체 해제" : `검색 결과 전체 선택 (${filtered.length}곳)`}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CHANNELS.map((c) => (
              <div key={c.key} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <label className="flex items-center gap-2 text-sm font-medium text-stone-800">
                  <input
                    type="checkbox"
                    checked={enabled[c.key]}
                    onChange={(e) => setEnabled((p) => ({ ...p, [c.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-400"
                  />
                  {c.label}
                </label>
                <div className="relative mt-2 flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    disabled={!enabled[c.key]}
                    value={percent[c.key]}
                    onChange={(e) => setPercent((p) => ({ ...p, [c.key]: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-right text-sm font-medium text-stone-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-stone-50 disabled:text-stone-400"
                  />
                  <span className="pointer-events-none absolute right-3 text-sm text-stone-400">%</span>
                </div>
              </div>
            ))}
          </div>

          {bulkError && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{bulkError}</p>
          )}
          {bulkDone && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" strokeWidth={2} /> {bulkDone}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={applyBulkFees}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Percent className="h-4 w-4" strokeWidth={1.75} />}
              선택 기관에 적용 ({selected.size}곳)
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "검색 결과가 없습니다" : "등록된 기관이 없습니다"}
          description={query ? "로그인 ID·기관명·전화번호를 다시 확인해 주세요." : "기관 등록 버튼으로 첫 기관을 추가해 보세요."}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <div key={o.id} className="relative h-full">
              <Link href={`/admin/organizations/${o.id}`}
                className="group block h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-600">
                      {o.logoUrl ? (
                        <Image src={o.logoUrl} alt="" fill unoptimized className="object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </span>
                    <div>
                      <p className="font-semibold text-stone-900">{o.name}</p>
                      <p className="text-xs text-stone-400">/{o.slug}</p>
                    </div>
                  </div>
                  {!bulkOpen && <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-brand-500" strokeWidth={1.75} />}
                </div>

                <p className="mt-3 truncate text-xs text-stone-400">
                  {o.loginId ?? "관리자 미지정"}
                  {o.phone ? ` · ${o.phone}` : ""}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {o.smsFullNumber ? (
                    <Badge tone="blue">{o.smsFullNumber}</Badge>
                  ) : (
                    <Badge tone="gray">문자번호 미부여</Badge>
                  )}
                  {o.isActive ? <Badge tone="green">운영 중</Badge> : <Badge tone="red">비활성</Badge>}
                  {o.smsMtEnabled && <Badge tone="violet">감사문자</Badge>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
                  <div>
                    <p className="text-xs text-stone-400">누적 모금</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-700">{formatKRW(o.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">후원자</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800">{o.donorCount}명</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">캠페인</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800">{o.campaignCount}개</p>
                  </div>
                </div>
              </Link>

              {bulkOpen && (
                <label
                  className="absolute right-4 top-4 z-10 flex cursor-pointer items-center rounded-lg bg-white/90 p-1"
                  title="수수료 일괄 적용 대상 선택"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-400"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
