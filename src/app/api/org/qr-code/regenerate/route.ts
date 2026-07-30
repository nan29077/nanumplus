import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { generateQrDataUrl, donatePageUrl } from "@/lib/qr";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

/** 기관 QR 코드 재발급 (본인 기관) */
export async function POST(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3001";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const targetUrl = donatePageUrl(org.slug, `${proto}://${host}`);
  const imageDataUrl = await generateQrDataUrl(targetUrl);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.qrCode.updateMany({
      where: { organizationId: orgId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    await tx.qrCode.create({ data: { organizationId: orgId, targetUrl, imageDataUrl } });
    await tx.organization.update({ where: { id: orgId }, data: { qrCodeUrl: imageDataUrl } });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "QR_CODE_REGENERATE",
    entityType: "Organization",
    entityId: orgId,
    detail: { targetUrl },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, imageDataUrl, targetUrl });
}
