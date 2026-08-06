"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, Image as ImageIcon, MessageSquare, Landmark,
  RefreshCw, CheckCircle2, AlertCircle, Target, FileText,
  Eye, EyeOff, Calendar, Users, Info,
} from "lucide-react";
import { DONATION_CHANNELS, CHANNEL_LABELS, type DonationChannel } from "@/lib/campaign-schema";

type Initial = {
  id?: string;
  title?: string;
  coverImageUrl?: string | null;
  goalAmount?: number;
  startDate?: string;
  endDate?: string;
  summary?: string | null;
  story?: string | null;
  reason?: string | null;
  usagePlan?: string | null;
  beneficiary?: string | null;
  messageToDonors?: string | null;
  allowedChannels?: string[] | null;
  status?: string;
  isPublished?: boolean;
};

const field =
  "mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors";
const labelCls = "text-sm font-medium text-stone-700";
const sectionCls = "rounded-2xl border border-stone-200 bg-white p-6 shadow-card";

const CHANNEL_META: Record<DonationChannel, { icon: typeof MessageSquare; color: string; desc: string }> = {
  SMS: {
    icon: MessageSquare,
    color: "text-sky-600 bg-sky-50 border-sky-200",
    desc: "문자 한 통으로 3,000원 후원",
  },
  EASY_TRANSFER: {
    icon: Landmark,
    color: "text-brand-600 bg-brand-50 border-brand-200",
    desc: "자유 금액 계좌이체",
  },
  RECURRING_TRANSFER: {
    icon: RefreshCw,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    desc: "매월 자동 정기후원",
  },
};

function parseAllowedChannels(raw?: string[] | null): DonationChannel[] {
  if (!raw) return ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
  return raw.filter((c): c is DonationChannel =>
    (DONATION_CHANNELS as readonly string[]).includes(c)
  );
}

export function CampaignForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
    goalAmount: initial?.goalAmount ?? 1_000_000,
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    summary: initial?.summary ?? "",
    story: initial?.story ?? "",
    reason: initial?.reason ?? "",
    usagePlan: initial?.usagePlan ?? "",
    beneficiary: initial?.beneficiary ?? "",
    messageToDonors: initial?.messageToDonors ?? "",
    allowedChannels: parseAllowedChannels(initial?.allowedChannels),
    status: initial?.status ?? "DRAFT",
    isPublished: initial?.isPublished ?? false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(initial?.coverImageUrl ?? "");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleChannel = (ch: DonationChannel) => {
    setForm((f) => {
      const has = f.allowedChannels.includes(ch);
      if (has && f.allowedChannels.length === 1) return f; // 최소 1개
      return {
        ...f,
        allowedChannels: has
          ? f.allowedChannels.filter((c) => c !== ch)
          : [...f.allowedChannels, ch],
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.allowedChannels.length === 0) {
      setError("후원 채널을 하나 이상 선택해 주세요.");
      return;
    }
    if (!Number.isFinite(form.goalAmount) || form.goalAmount < 10000) {
      setError("목표 금액을 10,000원 이상 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const url = isEdit ? `/api/org/campaigns/${initial!.id}` : "/api/org/campaigns";
    try {
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        setError(b?.error ?? "저장 중 문제가 발생했습니다.");
        return;
      }
      router.push("/org/campaigns");
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  // 달성률 미리보기
  const pct = Math.min(100, Math.round((0 / Math.max(form.goalAmount, 1)) * 100));

  return (
    <form onSubmit={submit} className="space-y-5">

      {/* ── 기본 정보 ── */}
      <section className={sectionCls}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
          <Target className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">기본 정보</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>캠페인 제목 *</label>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="예: 결식아동 따뜻한 한 끼 나눔"
              className={field}
              maxLength={120}
            />
            <p className="mt-1 text-right text-[11px] text-stone-400">{form.title.length}/120</p>
          </div>

          <div>
            <label className={labelCls}>한 줄 요약</label>
            <input
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="캠페인을 한 문장으로 소개해 주세요. (공개 페이지에 노출됩니다)"
              className={field}
              maxLength={300}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>목표 금액(원) *</label>
              <input
                type="number"
                min={10000}
                step={10000}
                required
                value={form.goalAmount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set("goalAmount", Number.isFinite(v) ? v : 0); // 빈 값/잘못된 값에서 NaN 노출 방지
                }}
                className={field}
              />
              <p className="mt-1 text-[11px] text-stone-400">
                {form.goalAmount.toLocaleString("ko-KR")}원
              </p>
            </div>
            <div>
              <label className={labelCls}>시작일 *</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className={labelCls}>종료일 *</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>수혜 대상</label>
            <input
              value={form.beneficiary}
              onChange={(e) => set("beneficiary", e.target.value)}
              placeholder="예: 지역 결식아동 50명, 독거노인 가정 30가구"
              className={field}
            />
          </div>
        </div>
      </section>

      {/* ── 후원 채널 선택 ── */}
      <section className={sectionCls}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
          <CheckCircle2 className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">후원 버튼 설정</h2>
          <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
            선택한 채널만 캠페인 페이지에 버튼으로 표시됩니다
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {DONATION_CHANNELS.map((ch) => {
            const meta = CHANNEL_META[ch];
            const selected = form.allowedChannels.includes(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  selected
                    ? `border-current ${meta.color} shadow-sm`
                    : "border-stone-200 bg-white text-stone-400 hover:border-stone-300"
                }`}
              >
                {selected && (
                  <span className="absolute right-2 top-2">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                  </span>
                )}
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? "bg-white/70" : "bg-stone-100"}`}>
                  <meta.icon className={`h-4 w-4 ${selected ? "" : "text-stone-400"}`} strokeWidth={1.75} />
                </span>
                <div>
                  <p className={`font-semibold text-sm ${selected ? "" : "text-stone-500"}`}>
                    {CHANNEL_LABELS[ch]}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${selected ? "opacity-80" : "text-stone-400"}`}>
                    {meta.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {form.allowedChannels.length === 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-500">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
            최소 1개 이상의 후원 채널을 선택해야 합니다.
          </p>
        )}

        <div className="mt-4 rounded-xl bg-stone-50 p-3 text-[11px] text-stone-500">
          <p className="flex items-center gap-1.5 font-semibold text-stone-700">
            <Info className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
            캠페인 후원 버튼 미리보기
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.allowedChannels.length === 0 ? (
              <span className="text-stone-400">선택된 채널 없음</span>
            ) : (
              form.allowedChannels.map((ch) => {
                const meta = CHANNEL_META[ch];
                return (
                  <span
                    key={ch}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${meta.color}`}
                  >
                    <meta.icon className="h-3 w-3" strokeWidth={2} />
                    {CHANNEL_LABELS[ch]}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 대표 이미지 ── */}
      <section className={sectionCls}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
          <ImageIcon className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">대표 이미지</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>이미지 URL</label>
            <input
              value={form.coverImageUrl}
              onChange={(e) => {
                set("coverImageUrl", e.target.value);
                setImagePreview(e.target.value);
              }}
              placeholder="https://..."
              className={field}
            />
            <p className="mt-1.5 text-[11px] text-stone-400">
              외부 이미지 URL을 입력하면 자동 미리보기가 표시됩니다.
            </p>
          </div>
          <div className="flex items-center justify-center">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="미리보기"
                className="h-36 w-full rounded-xl object-cover shadow"
                onError={() => setImagePreview("")}
              />
            ) : (
              <div className="flex h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 text-stone-300">
                <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
                <p className="mt-1 text-xs">미리보기</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 스토리 & 사용 계획 ── */}
      <section className={sectionCls}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
          <FileText className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">스토리 &amp; 사용 계획</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>캠페인 스토리</label>
            <textarea
              rows={6}
              value={form.story}
              onChange={(e) => set("story", e.target.value)}
              placeholder="왜 이 캠페인이 필요한지, 어떤 변화를 만들고 싶은지 자세히 들려주세요. 후원자가 공감할수록 참여율이 높아집니다."
              className={field}
              maxLength={8000}
            />
            <p className="mt-1 text-right text-[11px] text-stone-400">{form.story.length}/8000</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>모금이 필요한 이유</label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="현황과 어려움을 구체적으로 설명해 주세요."
                className={field}
              />
            </div>
            <div>
              <label className={labelCls}>후원금 사용 계획</label>
              <textarea
                rows={4}
                value={form.usagePlan}
                onChange={(e) => set("usagePlan", e.target.value)}
                placeholder="후원금이 어떻게 사용될지 항목별로 설명해 주세요."
                className={field}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>후원자에게 전하는 메시지</label>
            <input
              value={form.messageToDonors}
              onChange={(e) => set("messageToDonors", e.target.value)}
              placeholder="예: 따뜻한 마음으로 함께해 주셔서 감사합니다."
              className={field}
            />
          </div>
        </div>
      </section>

      {/* ── 공개 설정 ── */}
      <section className={sectionCls}>
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
          <Eye className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">공개 설정</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>진행 상태</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={`${field} bg-white`}
            >
              <option value="DRAFT">임시저장 (비공개)</option>
              <option value="ACTIVE">진행 중</option>
              <option value="ENDED">종료</option>
              <option value="CLOSED">마감</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 pt-7">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                form.isPublished
                  ? "border-brand-200 bg-brand-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {form.isPublished ? (
                    <span className="flex items-center gap-1.5 text-brand-700">
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />공개 캠페인으로 게시
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />비공개 (관리자만 확인)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-stone-400">
                  {form.isPublished
                    ? "캠페인 목록 및 후원 페이지에 표시됩니다."
                    : "공개 후원 페이지에 표시되지 않습니다."}
                </p>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* ── 에러 + 저장 버튼 ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy || form.allowedChannels.length === 0}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="h-4 w-4" strokeWidth={1.75} />
          )}
          {isEdit ? "변경 저장" : "캠페인 만들기"}
        </button>
      </div>
    </form>
  );
}
