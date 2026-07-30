import Link from "next/link";
import { CalendarClock, Users, MessageSquare, Landmark, RefreshCw, ExternalLink } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/badge";
import type { DonationChannel } from "@/lib/campaign-schema";
import { CHANNEL_LABELS } from "@/lib/campaign-schema";

const CHANNEL_ICON: Record<DonationChannel, typeof MessageSquare> = {
  SMS: MessageSquare,
  EASY_TRANSFER: Landmark,
  RECURRING_TRANSFER: RefreshCw,
};

const CHANNEL_COLOR: Record<DonationChannel, string> = {
  SMS: "bg-sky-50 text-sky-600 border-sky-100",
  EASY_TRANSFER: "bg-brand-50 text-brand-600 border-brand-100",
  RECURRING_TRANSFER: "bg-amber-50 text-amber-600 border-amber-100",
};

function parseChannels(raw?: string | null): DonationChannel[] {
  if (!raw) return ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DonationChannel[];
  } catch {}
  return ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
}

/** 공개용 카드 (admin 캠페인 목록, 공개 페이지) */
export function CampaignCard({
  title, orgName, coverImageUrl, goalAmount, currentAmount, endDate, donorCount, status, allowedChannels, slug,
}: {
  title: string;
  orgName: string;
  coverImageUrl: string | null;
  goalAmount: number;
  currentAmount: number;
  endDate: Date;
  donorCount: number;
  status: string;
  allowedChannels?: string | null;
  slug?: string;
}) {
  const pct = Math.min(100, Math.round((currentAmount / Math.max(goalAmount, 1)) * 100));
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));
  const channels = parseChannels(allowedChannels);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-40 bg-gradient-to-br from-brand-100 to-brand-50">
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute left-3 top-3"><StatusBadge status={status} /></span>
        {slug && (
          <Link
            href={`/campaigns/${slug}`}
            target="_blank"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg bg-white/80 text-stone-500 hover:bg-white"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs text-stone-400">{orgName}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-stone-900">{title}</h3>

        {/* 달성률 */}
        <div className="mt-4">
          <div className="flex items-end justify-between text-sm">
            <span className="font-bold text-brand-700">{pct}%</span>
            <span className="text-stone-500">{formatKRW(currentAmount)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-stone-400">
            목표 {formatKRW(goalAmount)}
          </p>
        </div>

        {/* 후원 채널 배지 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {channels.map((ch) => {
            const Icon = CHANNEL_ICON[ch];
            return (
              <span
                key={ch}
                className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${CHANNEL_COLOR[ch]}`}
              >
                <Icon className="h-3 w-3" strokeWidth={2} />
                {CHANNEL_LABELS[ch]}
              </span>
            );
          })}
        </div>

        {/* 메타 */}
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
            {daysLeft > 0 ? `${daysLeft}일 남음` : "마감"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
            {donorCount.toLocaleString("ko-KR")}명 참여
          </span>
        </div>
      </div>
    </article>
  );
}

/** 관리형 카드 — 편집/삭제/공개 토글 버튼 포함 (org 캠페인 목록 전용) */
export function OrgCampaignCard({
  id, title, coverImageUrl, goalAmount, currentAmount, endDate, donorCount,
  status, isPublished, allowedChannels, slug,
}: {
  id: string;
  title: string;
  coverImageUrl: string | null;
  goalAmount: number;
  currentAmount: number;
  endDate: Date;
  donorCount: number;
  status: string;
  isPublished: boolean;
  allowedChannels?: string | null;
  slug: string;
}) {
  const pct = Math.min(100, Math.round((currentAmount / Math.max(goalAmount, 1)) * 100));
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));
  const channels = parseChannels(allowedChannels);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
      {/* 커버 */}
      <div className="relative h-36 bg-gradient-to-br from-brand-100 to-brand-50">
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <StatusBadge status={status} />
          {isPublished ? (
            <Badge tone="green">공개</Badge>
          ) : (
            <Badge tone="gray">비공개</Badge>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 font-semibold text-stone-900">{title}</h3>

        {/* 달성률 */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-brand-700">{pct}%</span>
            <span className="text-stone-500">
              {formatKRW(currentAmount)} / {formatKRW(goalAmount)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 후원 채널 */}
        <div className="mt-3 flex flex-wrap gap-1">
          {channels.map((ch) => {
            const Icon = CHANNEL_ICON[ch];
            return (
              <span
                key={ch}
                className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${CHANNEL_COLOR[ch]}`}
              >
                <Icon className="h-3 w-3" strokeWidth={2} />
                {CHANNEL_LABELS[ch]}
              </span>
            );
          })}
        </div>

        {/* 메타 */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-0.5">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
            {daysLeft > 0 ? `${daysLeft}일 남음` : "마감"}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
            {donorCount.toLocaleString("ko-KR")}명
          </span>
        </div>

        {/* 관리 버튼 */}
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <Link
            href={`/org/campaigns/${id}/edit`}
            className="flex-1 rounded-lg border border-stone-200 py-1.5 text-center text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            수정
          </Link>
          <Link
            href={`/campaigns/${slug}`}
            target="_blank"
            className="flex-1 rounded-lg border border-brand-200 py-1.5 text-center text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            미리보기
          </Link>
        </div>
      </div>
    </article>
  );
}
