import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTransferAdapter } from "@/lib/adapters";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { getClientIp, recurringInitSchema } from "@/lib/validation";
import { getDonorSession } from "@/lib/donor-auth";

/**
 * 온기 정기 계좌후원 신청.
 * 정기후원 계약(RecurringDonation)을 생성하고, 첫 회차 후원(RECURRING_TRANSFER)을 완료로 기록한다.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`recurring-init:${ip}`, 20, 60_000)) {
    return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = recurringInitSchema.safeParse(body);
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

  const adapter = getTransferAdapter();
  const result = await adapter.registerRecurring({
    organizationId: org.id,
    amount: data.amount,
    donorName: sanitizeText(data.donorName, 40),
    donorPhone: data.donorPhone || undefined,
    donorEmail: data.donorEmail || undefined,
    dayOfMonth: data.dayOfMonth,
    campaignId: campaignId ?? undefined,
  });
  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const donor = await tx.donor.create({
      data: {
        organizationId: org.id,
        name: sanitizeText(data.donorName, 40),
        phone: data.donorPhone || null,
        email: data.donorEmail || null,
        privacyConsent: true,
        isRecurring: true,
        donorAccountId: donorSession?.donorAccountId ?? null,
      },
    });
    await tx.recurringDonation.create({
      data: {
        organizationId: org.id,
        donorId: donor.id,
        donorAccountId: donorSession?.donorAccountId ?? null,
        amount: data.amount,
        dayOfMonth: data.dayOfMonth,
        method: "TRANSFER",
        status: "ACTIVE",
        providerContractId: result.data.providerContractId,
      },
    });
    // 첫 회차 즉시 후원 기록
    await tx.donation.create({
      data: {
        organizationId: org.id,
        donorId: donor.id,
        donorAccountId: donorSession?.donorAccountId ?? null,
        campaignId,
        channel: "RECURRING_TRANSFER",
        amount: data.amount,
        status: "COMPLETED",
        providerName: adapter.providerName,
        memo: `정기후원 첫 회차 (매월 ${data.dayOfMonth}일)`,
      },
    });
    if (campaignId) {
      await tx.campaign.update({
        where: { id: campaignId },
        data: { currentAmount: { increment: data.amount } },
      });
    }
  });

  return Response.json({ ok: true, status: result.data.status });
}
