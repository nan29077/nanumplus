import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { getClientIp, transferInitSchema } from "@/lib/validation";
import { getDonorSession } from "@/lib/donor-auth";
import { ongiIsLive, signRef, buildOngiPaymentUrl, appBaseUrl } from "@/lib/ongi";
import { blockMockDonation } from "@/lib/payment-guard";

/**
 * 간편 계좌이체 후원 (온기 내통장결제).
 * - 라이브(ONGI_PROVIDER=live): PENDING 후원 생성 후 온기 결제창 URL(redirectUrl)을 반환.
 *   완료는 /api/webhooks/ongi 콜백으로 확정.
 * - Mock: 즉시 COMPLETED 처리(개발용).
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  // IP별 제한 + 전역 제한 (X-Forwarded-For 스푸핑 우회 대비)
  if (!rateLimit(`transfer-init:${ip}`, 20, 60_000) || !rateLimit("transfer-init:all", 300, 60_000)) {
    return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  // 인증 없는 공개 API 이므로, mock 모드에서 즉시 COMPLETED 후원이 만들어지지 않도록 차단
  const blocked = blockMockDonation(ongiIsLive());
  if (blocked) return blocked;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }

  const parsed = transferInitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const data = parsed.data;
  const donorSession = await getDonorSession();

  const org = await prisma.organization.findFirst({
    where: { slug: data.organizationSlug, isActive: true, deletedAt: null },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  let campaignId: string | null = null;
  if (data.campaignSlug) {
    const campaign = await prisma.campaign.findFirst({
      where: { slug: data.campaignSlug, organizationId: org.id, deletedAt: null },
      select: { id: true },
    });
    campaignId = campaign?.id ?? null;
  }

  const live = ongiIsLive();
  const name = sanitizeText(data.donorName, 40);

  // 후원자 + 후원(초기 상태) 생성
  const donationId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const donor = await tx.donor.create({
      data: {
        organizationId: org.id,
        name,
        phone: data.donorPhone || null,
        email: data.donorEmail || null,
        privacyConsent: true,
        donorAccountId: donorSession?.donorAccountId ?? null,
      },
    });
    const donation = await tx.donation.create({
      data: {
        organizationId: org.id,
        donorId: donor.id,
        donorAccountId: donorSession?.donorAccountId ?? null,
        campaignId,
        channel: "EASY_TRANSFER",
        amount: data.amount,
        status: live ? "PENDING" : "COMPLETED",
        providerName: "ongi",
        memo: live ? "온기 결제창 대기" : "Mock 즉시 완료",
      },
    });
    // Mock 즉시 완료면 캠페인 반영
    if (!live && campaignId) {
      await tx.campaign.update({ where: { id: campaignId }, data: { currentAmount: { increment: data.amount } } });
    }
    return donation.id;
  });

  if (live) {
    const base = appBaseUrl();
    const ref = donationId;
    const sig = signRef(ref);
    const callbackUrl = `${base}/api/webhooks/ongi?ref=${encodeURIComponent(ref)}&sig=${sig}`;
    const returnUrl = `${base}/donate/${org.slug}?pay=return`;
    const redirectUrl = buildOngiPaymentUrl({
      name,
      phone: data.donorPhone || undefined,
      amount: data.amount,
      callbackUrl,
      returnUrl,
    });
    return Response.json({ ok: true, status: "PENDING", redirectUrl });
  }

  return Response.json({ ok: true, status: "COMPLETED" });
}
