/**
 * 전체 후원 내역 raw SQL 헬퍼
 * SMS 채널 후원은 organizationId가 null일 수 있어 Prisma ORM 대신 raw SQL 사용
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import type { DonationRow } from "@/components/donation/donation-table";

export async function fetchAllDonations(
  orgId: string | null,
  channel: string | null,
  status: string | null,
  take: number,
  skip: number
): Promise<{ rows: DonationRow[]; total: number }> {
  // M-8: LIMIT/OFFSET을 Prisma.sql 템플릿 리터럴로 파라미터 바인딩하여 직접 삽입 제거.
  // take/skip은 서버에서 생성한 숫자값이지만, 파라미터 바인딩으로 통일해 SQL 인젝션 방어를 명확히 한다.
  const [rawRows, countRows] = await Promise.all([
    prisma.$queryRaw<unknown[]>(Prisma.sql`
      SELECT d.id, d.amount::float8 AS amount, d.channel::text, d.status::text,
             d."donatedAt", d."senderPhone", dn.name AS "donorName",
             o.name AS "orgName", c.title AS "campaignTitle"
      FROM "Donation" d
      LEFT JOIN "Donor" dn ON d."donorId" = dn.id
      LEFT JOIN "Organization" o ON d."organizationId" = o.id
      LEFT JOIN "Campaign" c ON d."campaignId" = c.id
      WHERE d."deletedAt" IS NULL
        AND (${orgId}::text IS NULL OR d."organizationId" = ${orgId})
        AND (${channel}::text IS NULL OR d.channel = ${channel}::"DonationChannel")
        AND (${status}::text IS NULL OR d.status = ${status}::"DonationStatus")
      ORDER BY d."donatedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Donation" d
      WHERE d."deletedAt" IS NULL
        AND (${orgId}::text IS NULL OR d."organizationId" = ${orgId})
        AND (${channel}::text IS NULL OR d.channel = ${channel}::"DonationChannel")
        AND (${status}::text IS NULL OR d.status = ${status}::"DonationStatus")
    `),
  ]);

  const rows: DonationRow[] = (rawRows as any[]).map((d) => ({
    id: String(d.id),
    amount: Number(d.amount),
    channel: String(d.channel),
    status: String(d.status),
    donatedAt: fmtKst(new Date(d.donatedAt), "yyyy-MM-dd HH:mm"),
    donorName: d.donorName ? String(d.donorName) : "익명",
    orgName: d.orgName ? String(d.orgName) : undefined,
    campaignTitle: d.campaignTitle ? String(d.campaignTitle) : null,
    senderPhone: d.senderPhone ? String(d.senderPhone) : null,
  }));

  return {
    rows,
    total: Number(countRows[0].count),
  };
}
