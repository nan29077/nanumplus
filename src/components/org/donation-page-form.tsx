"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, Check, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink,
  Type, Quote, Image as ImageIcon, Link2, Plus as PlusIcon, CheckCircle2, Eye,
} from "lucide-react";
import {
  ALL_CHANNELS, CHANNEL_META, type DonationChannelKey,
  type DonationPageConfig, type StoryBlock,
  LINK_TYPES, LINK_TYPE_LABELS, LINK_TYPE_BUTTON_LABELS, type LinkButton, type LinkButtonType,
  DONATION_BANNER_PRESETS,
} from "@/lib/donation-page";
import { formatKRW } from "@/lib/utils";
import { ImageUploadField } from "@/components/org/image-upload-field";

const field = "mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500";
const labelCls = "text-sm font-medium text-stone-700";
const card = "space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card";
const sectionTitle = "text-sm font-bold text-stone-900";

export function DonationPageForm({
  slug, initial,
}: { slug: string; initial: DonationPageConfig }) {
  const router = useRouter();
  const [c, setC] = useState<DonationPageConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [savedModal, setSavedModal] = useState(false);
  const [savedConfig, setSavedConfig] = useState<DonationPageConfig | null>(null);

  const set = <K extends keyof DonationPageConfig>(k: K, v: DonationPageConfig[K]) => {
    setC((p) => ({ ...p, [k]: v }));
    setDone(false);
  };

  const toggleChannel = (ch: DonationChannelKey) => {
    const has = c.enabledChannels.includes(ch);
    const next = has ? c.enabledChannels.filter((x) => x !== ch) : [...c.enabledChannels, ch];
    if (next.length === 0) return; // 최소 1개
    // ALL_CHANNELS 순서 유지
    set("enabledChannels", ALL_CHANNELS.filter((x) => next.includes(x)));
  };

  const addAmount = () => {
    const n = Math.round(Number(amountInput));
    if (!Number.isFinite(n) || n < 1000) { setError("추천 금액은 1,000원 이상이어야 합니다."); return; }
    if (c.suggestedAmounts.includes(n)) { setAmountInput(""); return; }
    if (c.suggestedAmounts.length >= 8) { setError("추천 금액은 최대 8개까지 설정할 수 있습니다."); return; }
    setError("");
    set("suggestedAmounts", [...c.suggestedAmounts, n].sort((a, b) => a - b));
    setAmountInput("");
  };
  const removeAmount = (n: number) => set("suggestedAmounts", c.suggestedAmounts.filter((x) => x !== n));

  // ── 스토리 블록 ──
  const addBlock = (type: StoryBlock["type"]) => {
    if (c.blocks.length >= 20) return;
    const b: StoryBlock =
      type === "text" ? { type: "text", heading: "", body: "" }
      : type === "quote" ? { type: "quote", body: "", author: "" }
      : { type: "image", imageUrl: "", caption: "" };
    set("blocks", [...c.blocks, b]);
  };
  const updateBlock = (i: number, patch: Partial<StoryBlock>) => {
    set("blocks", c.blocks.map((b, idx) => (idx === i ? ({ ...b, ...patch } as StoryBlock) : b)));
  };
  const removeBlock = (i: number) => set("blocks", c.blocks.filter((_, idx) => idx !== i));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= c.blocks.length) return;
    const next = [...c.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set("blocks", next);
  };

  const addLink = () => {
    if (c.links.length >= 8) return;
    set("links", [...c.links, { label: LINK_TYPE_BUTTON_LABELS.home, url: "", type: "home" as LinkButtonType }]);
  };
  const updateLink = (i: number, patch: Partial<LinkButton>) =>
    set("links", c.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => set("links", c.links.filter((_, idx) => idx !== i));
  const changeLinkType = (i: number, type: LinkButtonType) => {
    const current = c.links[i];
    const knownDefaults = new Set(Object.values(LINK_TYPE_BUTTON_LABELS));
    updateLink(i, {
      type,
      label: !current.label || knownDefaults.has(current.label) ? LINK_TYPE_BUTTON_LABELS[type] : current.label,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/org/donation-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeColor: c.themeColor,
          heroImageUrl: c.heroImageUrl ?? "",
          heroTitle: c.heroTitle ?? "",
          heroSubtitle: c.heroSubtitle ?? "",
          logoUrl: c.logoUrl ?? "",
          links: c.links,
          introTitle: c.introTitle ?? "",
          introBody: c.introBody ?? "",
          blocks: c.blocks.filter((b) => b.type !== "image" || Boolean(b.imageUrl)),
          suggestedAmounts: c.suggestedAmounts,
          enabledChannels: c.enabledChannels,
          thankYouTitle: c.thankYouTitle ?? "",
          thankYouMessage: c.thankYouMessage ?? "",
          showStats: c.showStats,
          showCampaigns: c.showCampaigns,
          showFaq: c.showFaq,
          showSmsFeed: c.showSmsFeed,
          isPublished: c.isPublished,
        }),
      });
      const response = await res.json().catch(() => null);
      if (!res.ok) {
        setError(response?.error ?? "저장 중 문제가 발생했습니다.");
        return;
      }
      setSavedConfig(response?.config ?? c);
      setSavedModal(true);
    } catch {
      setError("네트워크 오류로 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSaved = () => {
    if (savedConfig) setC(savedConfig);
    setSavedModal(false);
    setDone(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* 상단 액션바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={c.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
          <span className="font-medium text-stone-700">후원페이지 공개</span>
          <span className="text-xs text-stone-400">{c.isPublished ? "후원자에게 노출됩니다" : "비공개 (준비중 안내 표시)"}</span>
        </label>
        <div className="flex items-center gap-2">
          <a href={`/donate/${slug}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> 미리보기
          </a>
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {busy ? "저장 중..." : done ? "저장됨" : "저장"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</p>}

      {/* 테마 + 히어로 */}
      <div className={card}>
        <p className={sectionTitle}>테마 · 대표 영역</p>
        <div className="flex items-center gap-3">
          <label className={labelCls}>테마 색상</label>
          <input type="color" value={c.themeColor}
            onChange={(e) => set("themeColor", e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-lg border border-stone-200" />
          <input value={c.themeColor} onChange={(e) => set("themeColor", e.target.value)}
            className="w-32 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800"><Eye className="h-4 w-4" /> 이미지가 표시되는 위치</p>
          <p className="mt-1 text-xs leading-relaxed text-brand-700">대표 배너는 공개 후원페이지의 가장 위에 크게 표시되고, 로고는 상단 메뉴와 기관 소개 카드에 표시됩니다.</p>
        </div>
        <ImageUploadField
          label="대표 배너 이미지"
          description="나눔플러스 기본 배너 5종 중 선택하거나, 이미지 URL 입력 또는 파일 첨부를 이용하세요. 권장 비율은 16:9입니다."
          value={c.heroImageUrl}
          onChange={(url) => set("heroImageUrl", url)}
          kind="hero"
          presets={DONATION_BANNER_PRESETS}
        />
        <ImageUploadField
          label="기관 로고 이미지"
          description="비워두면 기관 기본 로고 또는 기관별 프로필 이미지가 사용됩니다. 정사각형 이미지를 권장합니다."
          value={c.logoUrl}
          onChange={(url) => set("logoUrl", url)}
          kind="logo"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>대표 문구</label>
            <input value={c.heroTitle ?? ""} onChange={(e) => set("heroTitle", e.target.value || null)}
              placeholder="예: 당신의 온기가 이웃을 살립니다" className={field} />
          </div>
          <div>
            <label className={labelCls}>보조 문구</label>
            <input value={c.heroSubtitle ?? ""} onChange={(e) => set("heroSubtitle", e.target.value || null)}
              placeholder="예: 작은 나눔이 큰 변화를 만듭니다" className={field} />
          </div>
        </div>
      </div>

      {/* 링크 버튼 (홈페이지·SNS) */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <p className={sectionTitle}>링크 버튼 (홈페이지·SNS)</p>
          <button type="button" onClick={addLink}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <PlusIcon className="h-3.5 w-3.5" /> 링크 추가
          </button>
        </div>
        {c.links.length === 0 && (
          <p className="rounded-xl bg-stone-50 px-4 py-5 text-center text-sm text-stone-400">
            기관 홈페이지·SNS 링크를 추가하세요. 후원페이지에서 <b>새 탭</b>으로 열립니다.
          </p>
        )}
        <div className="space-y-2.5">
          {c.links.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-stone-300" />
              <select value={l.type} onChange={(e) => changeLinkType(i, e.target.value as LinkButtonType)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
                {LINK_TYPES.map((t) => <option key={t} value={t}>{LINK_TYPE_LABELS[t]}</option>)}
              </select>
              <input value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })}
                placeholder={LINK_TYPE_BUTTON_LABELS[l.type]} className="min-w-40 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <input value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://..." className="min-w-[8rem] flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <button type="button" onClick={() => removeLink(i)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-stone-400">링크 종류에 맞는 아이콘과 기본 버튼명이 공개 후원페이지에 자동으로 표시됩니다. 버튼명은 기관에 맞게 직접 바꿀 수 있습니다.</p>
      </div>

      {/* 소개 */}
      <div className={card}>
        <p className={sectionTitle}>기관 소개</p>
        <div>
          <label className={labelCls}>소개 제목</label>
          <input value={c.introTitle ?? ""} onChange={(e) => set("introTitle", e.target.value || null)}
            placeholder="예: 우리는 이런 일을 합니다" className={field} />
        </div>
        <div>
          <label className={labelCls}>소개 본문</label>
          <textarea rows={4} value={c.introBody ?? ""} onChange={(e) => set("introBody", e.target.value || null)}
            className={field} />
        </div>
      </div>

      {/* 스토리 블록 */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <p className={sectionTitle}>스토리 블록</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => addBlock("text")}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <Type className="h-3.5 w-3.5" /> 글
            </button>
            <button type="button" onClick={() => addBlock("quote")}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <Quote className="h-3.5 w-3.5" /> 인용
            </button>
            <button type="button" onClick={() => addBlock("image")}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <ImageIcon className="h-3.5 w-3.5" /> 이미지
            </button>
          </div>
        </div>
        {c.blocks.length === 0 && (
          <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-400">
            스토리 블록을 추가해 후원자에게 기관의 이야기를 들려주세요.
          </p>
        )}
        <div className="space-y-3">
          {c.blocks.map((b, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">
                  {b.type === "text" ? "글" : b.type === "quote" ? "인용" : "이미지"}
                </span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveBlock(i, -1)} className="rounded p-1 text-stone-400 hover:bg-stone-100"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveBlock(i, 1)} className="rounded p-1 text-stone-400 hover:bg-stone-100"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeBlock(i)} className="rounded p-1 text-rose-400 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {b.type === "text" && (
                <div className="space-y-2">
                  <input value={b.heading ?? ""} onChange={(e) => updateBlock(i, { heading: e.target.value })}
                    placeholder="소제목 (선택)" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <textarea rows={3} value={b.body} onChange={(e) => updateBlock(i, { body: e.target.value })}
                    placeholder="본문" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              )}
              {b.type === "quote" && (
                <div className="space-y-2">
                  <textarea rows={2} value={b.body} onChange={(e) => updateBlock(i, { body: e.target.value })}
                    placeholder="인용문" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input value={b.author ?? ""} onChange={(e) => updateBlock(i, { author: e.target.value })}
                    placeholder="출처 / 이름 (선택)" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              )}
              {b.type === "image" && (
                <div className="space-y-2">
                  <ImageUploadField label="스토리 이미지" description="URL 입력 또는 파일 첨부가 가능합니다."
                    value={b.imageUrl || null} onChange={(url) => updateBlock(i, { imageUrl: url ?? "" })} kind="story" />
                  <input value={b.caption ?? ""} onChange={(e) => updateBlock(i, { caption: e.target.value })}
                    placeholder="설명 (선택)" className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 후원 옵션 */}
      <div className={card}>
        <p className={sectionTitle}>후원 옵션</p>
        <div>
          <label className={labelCls}>추천 후원 금액</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.suggestedAmounts.map((n) => (
              <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                {formatKRW(n)}
                <button type="button" onClick={() => removeAmount(n)} className="text-brand-400 hover:text-brand-700">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input type="number" min={1000} step={1000} value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="예: 30000"
              className="w-40 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <button type="button" onClick={addAmount}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <Plus className="h-4 w-4" /> 추가
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>노출할 후원 방법</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ALL_CHANNELS.map((ch) => (
              <label key={ch} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 p-3 hover:bg-stone-50">
                <input type="checkbox" checked={c.enabledChannels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-brand-600" />
                <span>
                  <span className="block text-sm font-medium text-stone-800">{CHANNEL_META[ch].label}</span>
                  <span className="block text-xs text-stone-400">{CHANNEL_META[ch].desc}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">문자후원은 모바일에서만 동작합니다 (PC는 안내 문구 노출).</p>
        </div>
      </div>

      {/* 감사 메시지 + 노출 토글 */}
      <div className={card}>
        <p className={sectionTitle}>감사 메시지 · 표시 옵션</p>
        <div>
          <label className={labelCls}>감사 제목</label>
          <input value={c.thankYouTitle ?? ""} onChange={(e) => set("thankYouTitle", e.target.value || null)}
            placeholder="예: 후원해 주셔서 감사합니다" className={field} />
        </div>
        <div>
          <label className={labelCls}>감사 메시지</label>
          <textarea rows={2} value={c.thankYouMessage ?? ""} onChange={(e) => set("thankYouMessage", e.target.value || null)}
            className={field} />
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {[
            { k: "showStats" as const, label: "모금 현황 표시" },
            { k: "showCampaigns" as const, label: "진행 캠페인 표시" },
            { k: "showSmsFeed" as const, label: "문자후원 내역" },
            { k: "showFaq" as const, label: "자주 묻는 질문" },
          ].map((t) => (
            <label key={t.k} className="flex items-center gap-2 rounded-xl border border-stone-200 p-3 text-sm">
              <input type="checkbox" checked={c[t.k]} onChange={(e) => set(t.k, e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600" />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "저장 중..." : "후원페이지 저장"}
        </button>
      </div>

      {savedModal && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="saved-title">
          <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
            </span>
            <h2 id="saved-title" className="mt-4 text-lg font-bold text-stone-900">후원페이지 설정이 적용되었습니다</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">대표 이미지, 로고, 문구와 표시 옵션이 저장되었습니다. 확인을 누르면 최신 설정으로 화면을 갱신합니다.</p>
            <button type="button" onClick={confirmSaved} autoFocus
              className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700">
              확인
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
