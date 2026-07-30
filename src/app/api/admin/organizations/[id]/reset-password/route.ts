import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const schema = z.object({
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
});

/** 기관 관리자 비밀번호 초기화 (SUPER_ADMIN 전용) */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { admins: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const orgAdmin = org.admins[0]?.user;
  if (!orgAdmin) return Response.json({ error: "기관 관리자 계정이 없습니다." }, { status: 404 });

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: orgAdmin.id },
    data: { passwordHash: hashed },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORG_ADMIN_PASSWORD_RESET",
    entityType: "User",
    entityId: orgAdmin.id,
    detail: { organizationId: org.id, targetEmail: orgAdmin.email },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
