import { prisma } from "@/lib/prisma";
import { getDonorSession } from "@/lib/donor-auth";
import { getBillingAdapter } from "@/lib/adapters";

/** 후원자: 본인 정기후원 해지 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const donor = await getDonorSession();
  if (!donor) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rec = await prisma.recurringDonation.findUnique({
    where: { id: params.id },
    include: { billingKey: true },
  });
  if (!rec || rec.donorAccountId !== donor.donorAccountId) {
    return Response.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }
  if (rec.status === "CANCELLED") {
    return Response.json({ ok: true, alreadyCancelled: true });
  }

  // 카드 정기이면 공급자 빌링키 먼저 정리 (어댑터 실패해도 상태는 정리)
  const shouldDeleteKey = rec.method === "CARD" && rec.billingKey && rec.billingKey.status === "ACTIVE";
  if (shouldDeleteKey) {
    try {
      await getBillingAdapter().deleteBillingKey(rec.billingKey!.billingKeyRef);
    } catch { /* 어댑터 실패해도 상태는 정리 */ }
  }

  // 빌링키 상태와 정기후원 상태가 어긋나지 않도록 하나의 트랜잭션으로 갱신
  // (donor/billing/[id] 라우트와 동일한 패턴)
  await prisma.$transaction([
    ...(shouldDeleteKey
      ? [prisma.billingKey.update({
          where: { id: rec.billingKey!.id },
          data: { status: "DELETED", deletedAt: new Date() },
        })]
      : []),
    prisma.recurringDonation.update({
      where: { id: rec.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
