import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

export interface MigrationRow {
  donorName: string;
  phone?: string;
  email?: string;
  memo?: string;
  channel: string; // SMS | EASY_TRANSFER | RECURRING_TRANSFER
  amount: number;
  donatedAt: string; // ISO string or YYYY-MM-DD
  status?: string; // COMPLETED | PENDING | FAILED
  campaignTitle?: string;
}

/**
 * 엑셀 데이터 마이그레이션: 후원자 + 후원 내역 일괄 등록
 * Body: { organizationId: string; rows: MigrationRow[] }
 */
export async function POST(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: { organizationId?: string; rows?: MigrationRow[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { organizationId, rows } = body;
  if (!organizationId) return Response.json({ error: "기관을 선택해 주세요." }, { status: 400 });
  if (!Array.isArray(rows) || rows.length === 0) return Response.json({ error: "가져올 데이터가 없습니다." }, { status: 400 });
  if (rows.length > 5000) return Response.json({ error: "한 번에 최대 5,000건까지만 업로드할 수 있습니다." }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return Response.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const VALID_CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"];
  const VALID_STATUSES = ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"];

  let donorCreated = 0;
  let donorExisting = 0;
  let donationCreated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // 헤더 제외, 1-indexed

    // 유효성 검사
    if (!r.donorName?.trim()) {
      errors.push({ row: rowNum, message: "후원자명이 없습니다." });
      continue;
    }
    const channel = r.channel?.toUpperCase();
    if (!VALID_CHANNELS.includes(channel)) {
      errors.push({ row: rowNum, message: `채널 '${r.channel}'이 올바르지 않습니다. (SMS/EASY_TRANSFER/RECURRING_TRANSFER)` });
      continue;
    }
    const amount = Number(r.amount);
    if (!amount || amount <= 0) {
      errors.push({ row: rowNum, message: `후원금액이 올바르지 않습니다. (${r.amount})` });
      continue;
    }
    const donatedAt = r.donatedAt ? new Date(r.donatedAt) : null;
    if (!donatedAt || isNaN(donatedAt.getTime())) {
      errors.push({ row: rowNum, message: `후원일 '${r.donatedAt}'이 올바르지 않습니다.` });
      continue;
    }
    const status = VALID_STATUSES.includes((r.status ?? "").toUpperCase())
      ? (r.status!.toUpperCase() as "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED")
      : "COMPLETED";

    try {
      // 후원자 조회 또는 생성 (전화번호 기준, 없으면 이름 기준)
      let donor = null;
      if (r.phone?.trim()) {
        donor = await prisma.donor.findFirst({
          where: { organizationId, phone: r.phone.trim(), deletedAt: null },
        });
      }
      if (!donor) {
        donor = await prisma.donor.findFirst({
          where: { organizationId, name: r.donorName.trim(), deletedAt: null },
        });
      }

      if (donor) {
        donorExisting++;
      } else {
        donor = await prisma.donor.create({
          data: {
            organizationId,
            name: r.donorName.trim(),
            phone: r.phone?.trim() || null,
            email: r.email?.trim() || null,
            memo: r.memo?.trim() || null,
            privacyConsent: true, // 마이그레이션 데이터는 동의된 것으로 간주
          },
        });
        donorCreated++;
      }

      // 후원 내역 생성
      await prisma.donation.create({
        data: {
          organizationId,
          donorId: donor.id,
          channel: channel as "SMS" | "EASY_TRANSFER" | "RECURRING_TRANSFER",
          amount,
          status,
          donatedAt,
          memo: `[마이그레이션] ${r.memo ?? ""}`.trim(),
          providerName: "migration",
        },
      });
      donationCreated++;
    } catch (err) {
      errors.push({ row: rowNum, message: `처리 중 오류: ${(err as Error).message}` });
    }
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "DATA_MIGRATION",
    entityType: "Organization",
    entityId: organizationId,
    detail: { donorCreated, donorExisting, donationCreated, errorCount: errors.length },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({
    ok: true,
    donorCreated,
    donorExisting,
    donationCreated,
    errorCount: errors.length,
    errors: errors.slice(0, 20), // 최대 20개 오류만 반환
  });
}
