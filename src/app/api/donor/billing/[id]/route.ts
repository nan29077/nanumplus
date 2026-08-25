import { prisma } from "@/lib/prisma";
import { getDonorSession } from "@/lib/donor-auth";
import { getBillingAdapter } from "@/lib/adapters";

/** 후원자: 본인 등록 카드(빌링키) 삭제 — 연결된 활성 정기후원도 함께 해지 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const donor = await getDonorSession();
  if (!donor) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const bk = await prisma.billingKey.findUnique({ where: { id: params.id } });
  if (!bk || bk.donorAccountId !== donor.donorAccountId) {
    return Response.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    await getBillingAdapter().deleteBillingKey(bk.billingKeyRef);
  } catch { /* 무시하고 상태 정리 */ }

  await prisma.$transaction([
    prisma.recurringDonation.updateMany({
      where: { billingKeyId: bk.id, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    prisma.billingKey.update({
      where: { id: bk.id },
      data: { status: "DELETED", deletedAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
