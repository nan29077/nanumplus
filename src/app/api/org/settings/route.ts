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

/** 계좌번호는 감사 로그에도 원문을 남기지 않는다 (뒤 4자리만). */
function maskAccount(v?: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

const BANK_FIELDS = ["bankName", "bankAccount", "bankHolder"] as const;

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

  // ── 정산계좌 변경 감지 ──────────────────────────────────────────────────────
  // 기관관리자가 정산계좌를 아무 제약 없이 바꿀 수 있으면 후원금 탈취 경로가 된다.
  // 변경 전/후 값을 별도 감사 로그(ORGANIZATION_BANK_ACCOUNT_CHANGE)로 남겨
  // 최고관리자가 추적할 수 있게 한다. (계좌번호 원문은 남기지 않는다)
  const before = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, bankName: true, bankAccount: true, bankHolder: true },
  });

  const bankChanges: Record<string, { before: string | null; after: string | null }> = {};
  for (const f of BANK_FIELDS) {
    const next = d[f];
    if (next === undefined) continue;
    const prev = before?.[f] ?? null;
    const nextVal = next || null;
    if (prev === nextVal) continue;
    bankChanges[f] =
      f === "bankAccount"
        ? { before: maskAccount(prev), after: maskAccount(nextVal) }
        : { before: prev, after: nextVal };
  }

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

  const ipAddress = getClientIp(req.headers);

  // 일반 정보 변경 로그 — 계좌번호 원문은 마스킹해서 남긴다.
  const detail: Record<string, unknown> = { ...d };
  if (detail.bankAccount !== undefined) detail.bankAccount = maskAccount(d.bankAccount ?? null);

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORGANIZATION_SELF_UPDATE",
    entityType: "Organization",
    entityId: orgId,
    detail,
    ipAddress,
  });

  // 정산계좌가 실제로 바뀐 경우에만 별도 감사 로그를 추가로 남긴다.
  if (Object.keys(bankChanges).length > 0) {
    await writeAuditLog({
      userId: auth.user.id,
      action: "ORGANIZATION_BANK_ACCOUNT_CHANGE",
      entityType: "Organization",
      entityId: orgId,
      detail: {
        organizationName: before?.name ?? null,
        changedBy: auth.user.email,
        changes: bankChanges,
      },
      ipAddress,
    });
  }

  return Response.json({ ok: true });
}
