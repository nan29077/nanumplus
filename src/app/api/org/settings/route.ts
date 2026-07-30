import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const schema = z.object({
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  logoUrl: z.string().url("로고 URL 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  bankName: z.string().max(50).optional(),
  bankAccount: z.string().max(50).optional(),
  bankHolder: z.string().max(50).optional(),
});

/** 기관 관리자: 본인 기관의 기본 정보 수정 (문자번호/slug 등 민감 항목 제외) */
export async function PATCH(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const d = parsed.data;

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(d.description !== undefined ? { description: d.description ? sanitizeText(d.description, 500) : null } : {}),
      ...(d.address !== undefined ? { address: d.address ? sanitizeText(d.address, 200) : null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.logoUrl !== undefined ? { logoUrl: d.logoUrl || null } : {}),
      ...(d.bankName !== undefined ? { bankName: d.bankName || null } : {}),
      ...(d.bankAccount !== undefined ? { bankAccount: d.bankAccount || null } : {}),
      ...(d.bankHolder !== undefined ? { bankHolder: d.bankHolder || null } : {}),
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_SELF_UPDATE",
    entityType: "Organization",
    entityId: orgId,
    detail: d as Record<string, unknown>,
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
