import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { maskPhone, maskEmail } from "@/lib/masking";
import { writeAuditLog } from "@/lib/audit";
import { fmtKst } from "@/lib/kst-date";
import { getClientIp } from "@/lib/validation";

/** 후원자 목록 CSV 다운로드 (개인정보 보호를 위해 연락처/이메일 마스킹) */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const donors = await prisma.donor.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      donations: { where: { status: "COMPLETED", deletedAt: null }, select: { amount: true } },
    },
  });

  const header = ["이름", "연락처(마스킹)", "이메일(마스킹)", "정기후원", "누적후원액", "후원건수", "등록일"];
  const lines = donors.map((d) => {
    const total = d.donations.reduce((s: number, x: { amount: number }) => s + x.amount, 0);
    return [
      d.name,
      maskPhone(d.phone),
      maskEmail(d.email),
      d.isRecurring ? "예" : "아니오",
      String(total),
      String(d.donations.length),
      fmtKst(d.createdAt, "yyyy-MM-dd"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\r\n");

  await writeAuditLog({
    userId: auth.user.id,
    action: "DONOR_EXPORT",
    entityType: "Organization",
    entityId: orgId,
    detail: { count: donors.length },
    ipAddress: getClientIp(req.headers),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donors_${fmtKst(new Date(), "yyyyMMdd")}.csv"`,
    },
  });
}
