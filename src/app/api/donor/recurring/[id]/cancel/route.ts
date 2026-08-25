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

  // 카드 정기이면 빌링키도 정리
  if (rec.method === "CARD" && rec.billingKey && rec.billingKey.status === "ACTIVE") {
    try {
      await getBillingAdapter().deleteBillingKey(rec.billingKey.billingKeyRef);
    } catch { /* 어댑터 실패해도 상태는 정리 */ }
    await prisma.billingKey.update({
      where: { id: rec.billingKey.id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
  }

  await prisma.recurringDonation.update({
    where: { id: rec.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return Response.json({ ok: true });
}
