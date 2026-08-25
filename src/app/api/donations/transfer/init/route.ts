import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransferAdapter } from "@/lib/adapters";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { getClientIp, transferInitSchema } from "@/lib/validation";
import { getDonorSession } from "@/lib/donor-auth";
import { checkDonationPolicy } from "@/lib/channel-policy";
import { findOrCreateDonor } from "@/lib/donor";

/**
 * 온기 간편 계좌이체 후원.
 * Mock 어댑터는 즉시 COMPLETED 를 반환하므로 후원 레코드를 완료 상태로 생성한다.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`transfer-init:${ip}`, 20, 60_000)) {
    return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = transferInitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const data = parsed.data;
  const donorSession = await getDonorSession();

  const org = await prisma.organization.findFirst({
    where: { slug: parsed.data.organizationSlug, isActive: true, deletedAt: null },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  // H-2: 기관 채널 정책 · 캠페인 상태/기간/허용채널 서버 검증
  const policy = await checkDonationPolicy({
    organizationId: org.id,
    channel: "EASY_TRANSFER",
    campaignSlug: data.campaignSlug,
  });
  if (!policy.ok) return Response.json({ error: policy.error }, { status: policy.status });
  const campaignId = policy.campaignId;

  const adapter = getTransferAdapter();
  const result = await adapter.initEasyTransfer({
    organizationId: org.id,
    amount: data.amount,
    donorName: sanitizeText(data.donorName, 40),
    donorPhone: data.donorPhone || undefined,
    donorEmail: data.donorEmail || undefined,
    campaignId: campaignId ?? undefined,
  });
  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  const status = result.data.status === "COMPLETED" ? "COMPLETED" : "PENDING";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // H-1: 전화번호·이메일로 기존 후원자를 먼저 찾고, 없을 때만 생성
    const donorId = await findOrCreateDonor(tx, {
      organizationId: org.id,
      name: sanitizeText(data.donorName, 40),
      phone: data.donorPhone || null,
      email: data.donorEmail || null,
      privacyConsent: true,
      donorAccountId: donorSession?.donorAccountId ?? null,
    });
    await tx.donation.create({
      data: {
        organizationId: org.id,
        donorId,
        donorAccountId: donorSession?.donorAccountId ?? null,
        campaignId,
        channel: "EASY_TRANSFER",
        amount: data.amount,
        status,
        providerName: adapter.providerName,
        providerTransactionId: result.data.providerTransactionId,
      },
    });
    if (campaignId && status === "COMPLETED") {
      await tx.campaign.update({
        where: { id: campaignId },
        data: { currentAmount: { increment: data.amount } },
      });
    }
  });

  return Response.json({ ok: true, status });
}
