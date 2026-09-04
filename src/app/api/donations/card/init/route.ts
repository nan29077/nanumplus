import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBillingAdapter } from "@/lib/adapters";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { getClientIp, cardInitSchema } from "@/lib/validation";
import { getDonorSession } from "@/lib/donor-auth";
import { checkDonationPolicy } from "@/lib/channel-policy";
import { findOrCreateDonor } from "@/lib/donor";
import { blockMockDonation } from "@/lib/payment-guard";

/**
 * 신용카드 정기후원 신청 (핵토 빌링키).
 *  1) 빌링키 발급 (카드 등록)
 *  2) 첫 회차 즉시 청구
 *  3) BillingKey · RecurringDonation(method=CARD) · 첫 회차 Donation(RECURRING_CARD) 기록
 * 실연동 시에는 카드정보 입력이 핵토 결제창에서 이뤄지고 서버는 카드 원문을 저장하지 않는다.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  // IP별 제한 + 전역 제한 (X-Forwarded-For 스푸핑 우회 대비)
  if (!rateLimit(`card-init:${ip}`, 20, 60_000) || !rateLimit("card-init:all", 300, 60_000)) {
    return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  // 인증 없는 공개 API 이므로, mock 빌링 어댑터가 즉시 COMPLETED 후원을 만들지 못하게 차단
  const blocked = blockMockDonation(process.env.HECTO_BILLING_PROVIDER === "live");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = cardInitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const data = parsed.data;
  const donorSession = await getDonorSession();

  const org = await prisma.organization.findFirst({
    where: { slug: data.organizationSlug, isActive: true, deletedAt: null },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  // H-2: 기관 채널 정책 · 캠페인 상태/기간/허용채널 서버 검증
  // (결제창 호출 전에 검증해야 실패 시 빌링키가 낭비되지 않는다)
  const policy = await checkDonationPolicy({
    organizationId: org.id,
    channel: "RECURRING_CARD",
    campaignSlug: data.campaignSlug,
  });
  if (!policy.ok) return Response.json({ error: policy.error }, { status: policy.status });
  const campaignId = policy.campaignId;

  const billing = getBillingAdapter();

  // 1) 빌링키 발급
  const issued = await billing.issueBillingKey({
    organizationId: org.id,
    donorName: sanitizeText(data.donorName, 40),
    donorPhone: data.donorPhone || undefined,
    donorEmail: data.donorEmail || undefined,
    cardIssuer: data.cardIssuer || undefined,
    cardLast4: data.cardLast4 || undefined,
  });
  if (!issued.ok) {
    return Response.json({ error: issued.message }, { status: 400 });
  }

  // 2) 첫 회차 청구
  const charge = await billing.chargeBillingKey({
    billingKeyRef: issued.data.billingKeyRef,
    amount: data.amount,
    organizationId: org.id,
    orderName: `${org.name} 정기후원`,
  });
  if (!charge.ok) {
    // 발급은 됐으나 첫 결제 실패 → 빌링키 정리 시도 후 실패 반환
    await billing.deleteBillingKey(issued.data.billingKeyRef).catch(() => {});
    return Response.json({ error: charge.message }, { status: 400 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // H-1: 전화번호·이메일로 기존 후원자를 먼저 찾고, 없을 때만 생성
    const donorId = await findOrCreateDonor(tx, {
      organizationId: org.id,
      name: sanitizeText(data.donorName, 40),
      phone: data.donorPhone || null,
      email: data.donorEmail || null,
      privacyConsent: true,
      isRecurring: true,
      donorAccountId: donorSession?.donorAccountId ?? null,
    });

    const billingKey = await tx.billingKey.create({
      data: {
        organizationId: org.id,
        donorId,
        donorAccountId: donorSession?.donorAccountId ?? null,
        provider: billing.providerName,
        billingKeyRef: issued.data.billingKeyRef,
        cardIssuer: issued.data.cardIssuer ?? null,
        cardLast4: issued.data.cardLast4 ?? null,
        status: "ACTIVE",
      },
    });

    await tx.recurringDonation.create({
      data: {
        organizationId: org.id,
        donorId,
        donorAccountId: donorSession?.donorAccountId ?? null,
        amount: data.amount,
        dayOfMonth: data.dayOfMonth,
        method: "CARD",
        status: "ACTIVE",
        billingKeyId: billingKey.id,
      },
    });

    await tx.donation.create({
      data: {
        organizationId: org.id,
        donorId,
        donorAccountId: donorSession?.donorAccountId ?? null,
        campaignId,
        channel: "RECURRING_CARD",
        amount: data.amount,
        status: "COMPLETED",
        providerName: billing.providerName,
        providerTransactionId: charge.data.providerTransactionId,
        memo: `카드 정기후원 첫 회차 (매월 ${data.dayOfMonth}일)`,
      },
    });

    if (campaignId) {
      await tx.campaign.update({
        where: { id: campaignId },
        data: { currentAmount: { increment: data.amount } },
      });
    }
  });

  return Response.json({ ok: true, status: "ACTIVE" });
}
