import { prisma } from "@/lib/prisma";
import { getInfobankAdapter } from "@/lib/adapters";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, smsInitSchema, SMS_DONATION_AMOUNT } from "@/lib/validation";

/**
 * 문자후원 시작.
 * SMS 후원 금액은 건당 3,000원 고정.
 * Mock 모드: PENDING 후원 레코드를 생성하고 안내 메시지를 반환한다.
 * 실제 연동 시 인포뱅크가 발송 결과를 /api/webhooks/infobank 로 통지하여 COMPLETED 로 전환한다.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`sms-init:${ip}`, 30, 60_000)) {
    return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = smsInitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  }
  const { organizationId, campaignId } = parsed.data;

  const org = await prisma.organization.findFirst({
    where: { id: organizationId, isActive: true, deletedAt: null },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  if (!org.smsFullNumber) {
    return Response.json({ error: "이 기관에는 아직 문자후원 번호가 부여되지 않았습니다." }, { status: 400 });
  }

  const adapter = getInfobankAdapter();
  const result = await adapter.initDonation({
    organizationId: org.id,
    smsFullNumber: org.smsFullNumber,
    amount: SMS_DONATION_AMOUNT,
    campaignId: campaignId ?? undefined,
  });
  if (!result.ok) {
    return Response.json({ error: result.message }, { status: 400 });
  }

  await prisma.donation.create({
    data: {
      organizationId: org.id,
      campaignId: campaignId ?? null,
      channel: "SMS",
      amount: SMS_DONATION_AMOUNT,
      status: "PENDING",
      providerName: adapter.providerName,
      providerTransactionId: result.data.providerTransactionId,
    },
  });

  return Response.json({
    ok: true,
    amount: SMS_DONATION_AMOUNT,
    smsNumber: result.data.smsNumber,
    guideMessage: result.data.guideMessage,
  });
}
