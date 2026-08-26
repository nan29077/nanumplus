import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const schema = z.object({
  // EMMA 수신번호 복원(mo_recipient + 4자리 emo_recipient)이 4자리를 전제하므로
  // 기관 생성 API와 동일하게 정확히 4자리만 허용한다
  code: z.string().regex(/^\d{4}$/, "문자 코드는 4자리 숫자여야 합니다."),
});

/**
 * SMS code assignment for org (SUPER_ADMIN only).
 * Base: #2540, format: #2540-XXXX (with dash)
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { code } = parsed.data;
  const baseNumber = "#2540";
  const fullNumber = `${baseNumber}-${code}`;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "Not found" }, { status: 404 });

  const dup = await prisma.organization.findFirst({
    where: {
      id: { not: org.id },
      OR: [{ smsCode: code }, { smsFullNumber: fullNumber }],
    },
  });
  if (dup) {
    return Response.json({ error: `Already assigned to ${dup.name}` }, { status: 409 });
  }
  // 이력 전체가 아니라 "현재 유효한(isActive) 배정"만 중복으로 판단한다.
  // → 회수된 번호는 다른 기관에 재배정 가능.
  const assignDup = await prisma.smsNumberAssignment.findFirst({
    where: { fullNumber, isActive: true },
  });
  if (assignDup && assignDup.organizationId !== org.id) {
    return Response.json({ error: "이미 배정된 번호입니다." }, { status: 409 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.smsNumberAssignment.updateMany({
      where: { organizationId: org.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    await tx.organization.update({
      where: { id: org.id },
      data: { smsBaseNumber: baseNumber, smsCode: code, smsFullNumber: fullNumber },
    });
    await tx.smsNumberAssignment.create({
      data: {
        organizationId: org.id,
        baseNumber,
        code,
        fullNumber,
        assignedById: auth.user.id,
      },
    });
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "SMS_CODE_ASSIGN",
    entityType: "Organization",
    entityId: org.id,
    detail: { code, fullNumber, previous: org.smsFullNumber },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, smsFullNumber: fullNumber });
}
