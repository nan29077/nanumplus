import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"] as const;

const bulkSchema = z.object({
  organizationIds: z.array(z.string().min(1)).min(1, "적용할 기관을 선택해 주세요.").max(500),
  fees: z
    .array(
      z.object({
        channel: z.enum(CHANNELS),
        feePercent: z
          .number({ invalid_type_error: "수수료율은 숫자로 입력해 주세요." })
          .min(0, "수수료율은 0% 이상이어야 합니다.")
          .max(100, "수수료율은 100% 이하여야 합니다."),
      })
    )
    .min(1, "적용할 채널을 하나 이상 선택해 주세요."),
});

/** PUT /api/admin/organizations/fees/bulk — 여러 기관에 채널별 수수료 일괄 적용 */
export async function PUT(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
      { status: 400 }
    );
  }
  const { organizationIds, fees } = parsed.data;

  // 중복 채널 제거 (마지막 값 우선)
  const feeMap = new Map(fees.map((f) => [f.channel, f.feePercent]));
  const uniqueFees = Array.from(feeMap, ([channel, feePercent]) => ({ channel, feePercent }));

  // 존재하는(삭제되지 않은) 기관만 대상으로 한다.
  const orgs = await prisma.organization.findMany({
    where: { id: { in: Array.from(new Set(organizationIds)) }, deletedAt: null },
    select: { id: true },
  });
  if (orgs.length === 0) {
    return NextResponse.json({ error: "적용 가능한 기관이 없습니다." }, { status: 404 });
  }

  try {
    await prisma.$transaction(
      orgs.flatMap((org) =>
        uniqueFees.map((f) =>
          prisma.organizationFee.upsert({
            where: { organizationId_channel: { organizationId: org.id, channel: f.channel } },
            update: { feePercent: f.feePercent },
            create: { organizationId: org.id, channel: f.channel, feePercent: f.feePercent },
          })
        )
      )
    );
  } catch {
    return NextResponse.json(
      { error: "수수료 일괄 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORG_FEE_BULK_UPDATE",
    entityType: "Organization",
    detail: { organizationCount: orgs.length, organizationIds: orgs.map((o) => o.id), fees: uniqueFees },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, updatedOrganizations: orgs.length, fees: uniqueFees });
}
