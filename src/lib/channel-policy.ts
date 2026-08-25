/**
 * 후원 채널 · 캠페인 정책 서버 검증.
 *
 * H-2: 후원 시작 API가 클라이언트에서 넘어온 값만 믿고 후원을 생성해,
 * 기관이 꺼둔 채널이나 종료·비공개 캠페인으로도 API를 직접 호출하면 후원이 성립했다.
 * 화면에서 하던 노출 제어와 동일한 규칙을 서버에서 다시 검증한다.
 */
import { prisma } from "./prisma";
import { resolveDonationPage, ALL_CHANNELS, CHANNEL_META, type DonationChannelKey } from "./donation-page";

export type ChannelPolicyResult =
  | { ok: true; campaignId: string | null }
  | { ok: false; status: number; error: string };

/** 후원이 불가능한 캠페인 상태 */
const NON_DONATABLE_STATUS = new Set(["DRAFT", "ENDED", "CLOSED"]);

/** 캠페인 allowedChannels(JSON 문자열) → 채널 배열. 미설정이면 null */
function parseAllowedChannels(raw: string | null | undefined): DonationChannelKey[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const set = new Set(ALL_CHANNELS as string[]);
    const picked = parsed.filter((x): x is DonationChannelKey => typeof x === "string" && set.has(x));
    return picked.length ? picked : null;
  } catch {
    return null;
  }
}

/**
 * 기관의 채널 정책과 (선택된) 캠페인의 후원 가능 여부를 검증한다.
 *
 * - 기관 후원페이지(DonationPage.enabledChannels)에서 꺼진 채널이면 거부
 * - campaignSlug / campaignId 가 주어지면
 *   · 해당 기관 소유인지 (H-4: SMS 후원의 타기관 캠페인 지정 방지)
 *   · isPublished · status(DRAFT/ENDED/CLOSED) · startDate~endDate 기간
 *   · 캠페인 allowedChannels
 *   를 모두 검증하고 확정된 campaignId 를 돌려준다.
 */
export async function checkDonationPolicy(opts: {
  organizationId: string;
  channel: DonationChannelKey;
  campaignSlug?: string | null;
  campaignId?: string | null;
  now?: Date;
}): Promise<ChannelPolicyResult> {
  const { organizationId, channel } = opts;
  const now = opts.now ?? new Date();
  const channelLabel = CHANNEL_META[channel]?.label ?? channel;

  // 1) 기관 후원페이지 채널 정책
  let pageRow: Awaited<ReturnType<typeof prisma.donationPage.findUnique>> = null;
  try {
    pageRow = await prisma.donationPage.findUnique({ where: { organizationId } });
  } catch {
    // 마이그레이션 전 등 조회 실패 시 기본값(전 채널 허용)으로 폴백
    pageRow = null;
  }
  const cfg = resolveDonationPage(pageRow);
  if (!cfg.enabledChannels.includes(channel)) {
    return { ok: false, status: 400, error: `이 기관은 현재 ${channelLabel}을(를) 받지 않습니다.` };
  }

  // 2) 캠페인 검증 (지정된 경우에만)
  const slug = opts.campaignSlug?.trim() || null;
  const id = opts.campaignId?.trim() || null;
  if (!slug && !id) return { ok: true, campaignId: null };

  const campaign = await prisma.campaign.findFirst({
    where: {
      organizationId, // 타 기관 캠페인 지정 차단
      deletedAt: null,
      ...(id ? { id } : { slug: slug! }),
    },
    select: {
      id: true, isPublished: true, status: true,
      startDate: true, endDate: true, allowedChannels: true,
    },
  });
  if (!campaign) {
    return { ok: false, status: 404, error: "캠페인을 찾을 수 없습니다." };
  }
  if (!campaign.isPublished || NON_DONATABLE_STATUS.has(campaign.status)) {
    return { ok: false, status: 400, error: "현재 후원을 받지 않는 캠페인입니다." };
  }
  if (now < campaign.startDate) {
    return { ok: false, status: 400, error: "아직 모금이 시작되지 않은 캠페인입니다." };
  }
  if (now > campaign.endDate) {
    return { ok: false, status: 400, error: "모금 기간이 종료된 캠페인입니다." };
  }
  const allowed = parseAllowedChannels(campaign.allowedChannels);
  if (allowed && !allowed.includes(channel)) {
    return { ok: false, status: 400, error: `이 캠페인은 ${channelLabel}을(를) 지원하지 않습니다.` };
  }

  return { ok: true, campaignId: campaign.id };
}
