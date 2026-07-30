import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { donatePageUrl } from "@/lib/qr";

/** 기관 QR 코드 조회 */
export async function GET() {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findUnique({
    where: { id: auth.user.organizationId! },
    select: { slug: true, qrCodeUrl: true, name: true },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  return Response.json({
    qrCodeUrl: org.qrCodeUrl,
    targetUrl: donatePageUrl(org.slug),
    slug: org.slug,
    name: org.name,
  });
}
