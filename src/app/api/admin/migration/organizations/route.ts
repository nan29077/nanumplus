import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { sanitizeSlug } from "@/lib/sanitize";

export interface OrgMigrationRow {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
}

/**
 * 기관 목록 엑셀 마이그레이션
 * Body: { rows: OrgMigrationRow[] }
 */
export async function POST(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: { rows?: OrgMigrationRow[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { rows } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: "가져올 데이터가 없습니다." }, { status: 400 });
  }
  if (rows.length > 1000) {
    return Response.json({ error: "한 번에 최대 1,000건까지만 업로드할 수 있습니다." }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const errors: { row: number; name: string; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2;

    if (!r.name?.trim()) {
      errors.push({ row: rowNum, name: "", message: "기관명이 없습니다." });
      continue;
    }

    const name = r.name.trim();

    try {
      // 동일 기관명이 이미 존재하면 skip
      const existing = await prisma.organization.findFirst({
        where: { name, deletedAt: null },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // slug 자동 생성 (기관명 → 영문/숫자, 중복 시 번호 추가)
      let baseSlug = sanitizeSlug(name) || `org-${Date.now()}`;
      let slug = baseSlug;
      let attempt = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${attempt++}`;
      }

      await prisma.organization.create({
        data: {
          name,
          slug,
          description: r.description?.trim() || null,
          phone: r.phone?.trim() || null,
          email: r.email?.trim() || null,
          address: r.address?.trim() || null,
          bankName: r.bankName?.trim() || null,
          bankAccount: r.bankAccount?.trim() || null,
          bankHolder: r.bankHolder?.trim() || null,
          isActive: true,
        },
      });
      created++;
    } catch (err) {
      errors.push({ row: rowNum, name, message: `처리 중 오류: ${(err as Error).message}` });
    }
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "ORG_MIGRATION",
    entityType: "Organization",
    entityId: "bulk",
    detail: { created, skipped, errorCount: errors.length },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({
    ok: true,
    created,
    skipped,
    errorCount: errors.length,
    errors: errors.slice(0, 30),
  });
}
