import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { validateSenderNumber } from "@/lib/messaging";
import { getClientIp } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
  /** 감사 문자(MT) 기관별 발송 스위치 */
  smsMtEnabled: z.boolean().optional(),
  /** 기관 전용 MT 발신번호 (빈 문자열이면 전역 기본값 사용) */
  mtSenderNumber: z
    .string()
    .max(20)
    .regex(/^[0-9-]*$/, "발신번호는 숫자와 하이픈만 입력할 수 있습니다.")
    .optional()
    .nullable(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      admins: { include: { user: { select: { name: true, email: true, isActive: true } } } },
      smsAssignments: { orderBy: { assignedAt: "desc" } },
      qrCodes: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { donations: { where: { deletedAt: null } }, donors: { where: { deletedAt: null } }, campaigns: { where: { deletedAt: null } } } },
    },
  });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ organization: org });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const d = parsed.data;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  // 발신번호는 오타 시 발송이 통째로 실패하므로 저장 전에 형식을 확인한다.
  // (실제 발송 가능 여부는 인포뱅크 발신번호 사전등록 여부가 결정한다)
  let normalizedSender: string | null | undefined;
  if (d.mtSenderNumber !== undefined) {
    const raw = (d.mtSenderNumber ?? "").trim();
    if (raw === "") {
      normalizedSender = null;
    } else {
      const check = validateSenderNumber(raw);
      if (!check.ok) return Response.json({ error: check.reason }, { status: 400 });
      normalizedSender = check.normalized;
    }
  }

  // 발신번호 없이 스위치를 켤 수 없다 — 켜도 발송되지 않아 혼란만 준다.
  if (d.smsMtEnabled === true) {
    const effective =
      normalizedSender !== undefined ? normalizedSender : org.mtSenderNumber;
    if (!effective) {
      return Response.json(
        { error: "발신번호를 먼저 등록해야 감사 문자를 켤 수 있습니다." },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.organization.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: sanitizeText(d.name, 80) } : {}),
      ...(d.description !== undefined ? { description: d.description ? sanitizeText(d.description, 500) : null } : {}),
      ...(d.address !== undefined ? { address: d.address ? sanitizeText(d.address, 200) : null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      ...(d.smsMtEnabled !== undefined ? { smsMtEnabled: d.smsMtEnabled } : {}),
      ...(normalizedSender !== undefined ? { mtSenderNumber: normalizedSender } : {}),
    },
  });

  // 발송 스위치 변경은 별도 감사 로그로 남긴다 — "언제 누가 켰나"를 추적해야 하는 항목이다.
  if (d.smsMtEnabled !== undefined && d.smsMtEnabled !== org.smsMtEnabled) {
    await writeAuditLog({
      userId: auth.user.id,
      action: d.smsMtEnabled ? "ORGANIZATION_MT_ENABLE" : "ORGANIZATION_MT_DISABLE",
      entityType: "Organization",
      entityId: org.id,
      detail: { name: org.name, before: org.smsMtEnabled, after: d.smsMtEnabled },
      ipAddress: getClientIp(req.headers),
    });
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_UPDATE",
    entityType: "Organization",
    entityId: org.id,
    detail: d as Record<string, unknown>,
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, organization: updated });
}

/** soft delete */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  // smsCode/smsFullNumber는 전역 unique이므로, 회수하지 않으면 삭제된 기관이
  // 4자리 코드를 영구 점유해 다른 기관에 재배정할 수 없게 된다.
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false, smsCode: null, smsFullNumber: null },
    }),
    prisma.smsNumberAssignment.updateMany({
      where: { organizationId: params.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_DELETE",
    entityType: "Organization",
    entityId: org.id,
    detail: { name: org.name, revokedSmsCode: org.smsCode },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
