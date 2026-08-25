"use client";

import { useState } from "react";
import { MessageSquare, Landmark, RefreshCw, CreditCard, CheckCircle2, Copy, X } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { CHANNEL_META, type DonationChannelKey } from "@/lib/donation-page";

type Mode = null | "sms" | "transfer" | "recurring" | "card";
type Kind = "transfer" | "recurring" | "card";

const DEFAULT_AMOUNTS = [10000, 30000, 50000, 100000];

const CHANNEL_ICON: Record<DonationChannelKey, typeof MessageSquare> = {
  SMS: MessageSquare,
  EASY_TRANSFER: Landmark,
  RECURRING_TRANSFER: RefreshCw,
  RECURRING_CARD: CreditCard,
};

export function DonateActions({
  orgSlug, orgId, orgName, smsNumber, campaignSlug, sticky,
  enabledChannels = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"],
  suggestedAmounts = DEFAULT_AMOUNTS,
  themeColor = "#2f8f5b",
  thankYou,
  donor,
}: {
  orgSlug: string;
  orgId: string;
  orgName: string;
  smsNumber: string | null;
  campaignSlug?: string;
  sticky?: boolean;
  enabledChannels?: DonationChannelKey[];
  suggestedAmounts?: number[];
  themeColor?: string;
  thankYou?: { title?: string | null; message?: string | null };
  donor?: { name: string; email: string | null; phone?: string | null };
}) {
  const [mode, setMode] = useState<Mode>(null);

  const openFor = (ch: DonationChannelKey) => {
    setMode(
      ch === "SMS" ? "sms"
      : ch === "EASY_TRANSFER" ? "transfer"
      : ch === "RECURRING_TRANSFER" ? "recurring"
      : "card"
    );
  };

  const cols = Math.min(enabledChannels.length, 4);
  const buttons = (
    <div className={cn("grid gap-2.5", sticky ? "" : "mt-5")}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {enabledChannels.map((ch) => {
        const Icon = CHANNEL_ICON[ch];
        return (
          <button key={ch} onClick={() => openFor(ch)}
            style={{ backgroundColor: themeColor }}
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-semibold text-white transition hover:brightness-95">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span className="truncate">{CHANNEL_META[ch].short}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {sticky ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mx-auto max-w-3xl">{buttons}</div>
        </div>
      ) : (
        buttons
      )}

      {mode === "sms" && (
        <Modal onClose={() => setMode(null)} title="문자후원">
          <SmsPanel smsNumber={smsNumber} orgName={orgName} orgId={orgId} themeColor={themeColor} />
        </Modal>
      )}
      {mode === "transfer" && (
        <Modal onClose={() => setMode(null)} title="간편 계좌이체 후원">
          <DonationForm kind="transfer" orgSlug={orgSlug} campaignSlug={campaignSlug}
            presetAmounts={suggestedAmounts} themeColor={themeColor} thankYou={thankYou} donor={donor} />
        </Modal>
      )}
      {mode === "recurring" && (
        <Modal onClose={() => setMode(null)} title="정기 계좌후원 신청">
          <DonationForm kind="recurring" orgSlug={orgSlug} campaignSlug={campaignSlug}
            presetAmounts={suggestedAmounts} themeColor={themeColor} thankYou={thankYou} donor={donor} />
        </Modal>
      )}
      {mode === "card" && (
        <Modal onClose={() => setMode(null)} title="신용카드 정기후원">
          <DonationForm kind="card" orgSlug={orgSlug} campaignSlug={campaignSlug}
            presetAmounts={suggestedAmounts} themeColor={themeColor} thankYou={thankYou} donor={donor} />
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-stone-900/40 sm:place-items-center" role="dialog" aria-modal>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">{title}</h2>
          <button onClick={onClose} aria-label="닫기"
            className="grid h-8 w-8 place-items-center rounded-lg text-stone-400 hover:bg-stone-100">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function SmsPanel({ smsNumber, orgName, orgId, themeColor }: {
  smsNumber: string | null; orgName: string; orgId: string; themeColor: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!smsNumber) {
    return <p className="text-sm text-stone-500">이 기관에는 아직 문자후원 번호가 부여되지 않았습니다.</p>;
  }
  const smsHref = `sms:${smsNumber.replace("#", "%23")}?body=${encodeURIComponent("후원합니다")}`;

  const init = () => {
    fetch("/api/donations/sms/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId, amount: 3000 }),
    }).catch(() => {});
  };

  return (
    <div>
      <p className="text-sm leading-relaxed text-stone-500">
        아래 번호로 문자를 보내면 {orgName}에 후원이 전달됩니다.
        후원금은 휴대폰 요금에 합산 청구됩니다.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-4">
        <span className="text-xl font-bold tracking-wide" style={{ color: themeColor }}>{smsNumber}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(smsNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {/* 모바일 전용: 문자 앱 열기 (PC에서는 숨김) */}
      <a
        href={smsHref}
        onClick={init}
        style={{ backgroundColor: themeColor }}
        className="mt-4 block rounded-xl py-3 text-center text-sm font-semibold text-white hover:brightness-95 sm:hidden"
      >
        문자 앱 열기
      </a>
      <p className="mt-3 text-xs leading-relaxed text-stone-400">
        모바일에서는 위 버튼으로 문자 앱이 바로 열립니다.
        데스크톱에서는 휴대폰에서 위 번호로 문자를 보내 주세요.
      </p>
    </div>
  );
}

function DonationForm({
  kind, orgSlug, campaignSlug, presetAmounts, themeColor, thankYou, donor,
}: {
  kind: Kind;
  orgSlug: string;
  campaignSlug?: string;
  presetAmounts: number[];
  themeColor: string;
  thankYou?: { title?: string | null; message?: string | null };
  donor?: { name: string; email: string | null; phone?: string | null };
}) {
  const recurring = kind === "recurring" || kind === "card";
  const [amount, setAmount] = useState(presetAmounts[0] ?? 10000);
  const [name, setName] = useState(donor?.name ?? "");
  const [phone, setPhone] = useState(donor?.phone ?? "");
  const [email, setEmail] = useState(donor?.email ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(25);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const endpoint =
    kind === "card" ? "/api/donations/card/init"
    : kind === "recurring" ? "/api/donations/recurring/init"
    : "/api/donations/transfer/init";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError("개인정보 수집·이용에 동의해 주세요."); return; }
    if (!Number.isFinite(amount) || amount < 1000) {
      setError("후원 금액을 1,000원 이상 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug: orgSlug, campaignSlug,
          amount, donorName: name, donorPhone: phone, donorEmail: email,
          privacyConsent: consent,
          ...(recurring ? { dayOfMonth } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "후원 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류로 후원 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1.5} style={{ color: themeColor }} />
        <p className="mt-3 font-semibold text-stone-900">
          {thankYou?.title || (recurring ? "정기후원 신청이 완료되었습니다" : "후원이 완료되었습니다")}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {thankYou?.message
            || (recurring
              ? `매월 ${dayOfMonth}일에 ${formatKRW(amount)}이 후원됩니다.`
              : `${formatKRW(amount)}의 따뜻한 마음이 전달되었습니다.`)}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {kind === "card" && (
        <p className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-relaxed text-indigo-700">
          신용카드 정기후원은 핵토 빌링키로 매월 자동 결제됩니다.
          카드 정보 입력은 실제 연동 시 핵토 결제창에서 안전하게 진행됩니다. (현재 Mock)
        </p>
      )}
      <div>
        <label className="text-sm font-medium text-stone-700">후원 금액</label>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {presetAmounts.map((a) => (
            <button type="button" key={a} onClick={() => setAmount(a)}
              style={amount === a ? { borderColor: themeColor, color: themeColor, backgroundColor: `${themeColor}14` } : {}}
              className={cn(
                "rounded-xl border py-2 text-xs font-medium",
                amount === a ? "font-semibold" : "border-stone-200 text-stone-600"
              )}>
              {a >= 10000 ? `${(a / 10000).toLocaleString("ko-KR")}만원` : `${(a / 1000).toLocaleString("ko-KR")}천원`}
            </button>
          ))}
        </div>
        <input
          type="number" min={1000} step={1000} value={amount}
          onChange={(e) => {
            const v = Number(e.target.value);
            setAmount(Number.isFinite(v) ? v : 0);
          }}
          className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          aria-label="직접 입력 금액"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-700">이름</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동"
          className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-stone-700">연락처</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000"
            className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">이메일</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com"
            className="mt-1.5 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
      </div>
      {recurring && (
        <div>
          <label className="text-sm font-medium text-stone-700">매월 {kind === "card" ? "결제일" : "출금일"}</label>
          <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>매월 {d}일</option>
            ))}
          </select>
        </div>
      )}
      <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-brand-600" />
        후원 처리와 기부금 영수증 발급을 위한 개인정보 수집·이용에 동의합니다.
      </label>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy}
        style={{ backgroundColor: themeColor }}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">
        {busy ? "처리 중..."
          : recurring ? `매월 ${formatKRW(amount)} 정기후원 신청`
          : `${formatKRW(amount)} 후원하기`}
      </button>
      <p className="text-center text-[11px] text-stone-400">
        {kind === "card"
          ? "핵토 빌링키 자동결제로 처리됩니다 (현재 Mock 연동)"
          : "핵토 내통장결제로 안전하게 처리됩니다 (현재 Mock 연동)"}
      </p>
    </form>
  );
}
