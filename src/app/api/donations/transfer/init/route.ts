import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOnkiAdapter } from "@/lib/adapters";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { getClientIp, transferInitSchema } from "@/lib/validation";

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

  const org = await prisma.organization.findFirst({
    where: { slug: parsed.data.organizationSlug, isActive: true, deletedAt: null },
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

  const adapter = getOnkiAdapter();
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
    const donor = await tx.donor.create({
      data: {
        organizationId: org.id,
        name: sanitizeText(data.donorName, 40),
        phone: data.donorPhone || null,
        email: data.donorEmail || null,
        privacyConsent: true,
      },
    });
    await tx.donation.create({
      data: {
        organizationId: org.id,
        donorId: donor.id,
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
