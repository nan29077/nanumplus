import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { generateQrDataUrl, donatePageUrl } from "@/lib/qr";
import { getClientIp } from "@/lib/validation";

/** QR 코드 발급/재발급 (최고 관리자) */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const targetUrl = donatePageUrl(org.slug);
  const imageDataUrl = await generateQrDataUrl(targetUrl);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.qrCode.updateMany({
      where: { organizationId: org.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    await tx.qrCode.create({ data: { organizationId: org.id, targetUrl, imageDataUrl } });
    await tx.organization.update({ where: { id: org.id }, data: { qrCodeUrl: imageDataUrl } });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "QR_CODE_REGENERATE",
    entityType: "Organization",
    entityId: org.id,
    detail: { targetUrl },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, imageDataUrl, targetUrl });
}
