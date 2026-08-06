import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

const CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"] as const;

const feeSchema = z.object({
  fees: z.array(
    z.object({
      channel: z.enum(CHANNELS),
      feePercent: z.number().min(0).max(100),
    })
  ),
});

/** GET /api/admin/organizations/[id]/fees — 수수료 목록 조회 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  // MI-1: (prisma as any) 캐스팅 제거
  let fees: { channel: string; feePercent: number }[] = [];
  try {
    fees = await prisma.organizationFee.findMany({
      where: { organizationId: params.id },
      select: { channel: true, feePercent: true },
      orderBy: { channel: "asc" },
    });
  } catch {
    // 마이그레이션 전 — 빈 배열 반환
  }

  // 설정되지 않은 채널은 기본값 5%로 채워서 반환
  const feeMap = new Map(fees.map((f) => [f.channel, f.feePercent]));
  const result = CHANNELS.map((ch) => ({
    channel: ch,
    feePercent: feeMap.get(ch) ?? 5.0,
    isDefault: !feeMap.has(ch),
  }));

  return NextResponse.json({ fees: result });
}

/** PUT /api/admin/organizations/[id]/fees — 수수료 일괄 저장 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = feeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues }, { status: 400 });
  }

  // OrganizationFee upsert (채널별) — MI-1: (prisma as any) 캐스팅 제거
  try {
    await Promise.all(
      parsed.data.fees.map((f) =>
        prisma.organizationFee.upsert({
          where: {
            organizationId_channel: {
              organizationId: params.id,
              channel: f.channel,
            },
          },
          update: { feePercent: f.feePercent },
          create: {
            organizationId: params.id,
            channel: f.channel,
            feePercent: f.feePercent,
          },
        })
      )
    );
  } catch {
    return NextResponse.json(
      { error: "수수료 저장에 실패했습니다. DB 마이그레이션이 필요할 수 있습니다." },
      { status: 500 }
    );
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORG_FEE_UPDATE",
    entityType: "Organization",
    entityId: params.id,
    detail: { orgName: org.name, fees: parsed.data.fees },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
