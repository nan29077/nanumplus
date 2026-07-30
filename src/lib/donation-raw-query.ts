/**
 * 전체 후원 내역 raw SQL 헬퍼
 * SMS 채널 후원은 organizationId가 null일 수 있어 Prisma ORM 대신 raw SQL 사용
 */
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import type { DonationRow } from "@/components/donation/donation-table";

const WHERE =
  'd."deletedAt" IS NULL' +
  ' AND ($1::text IS NULL OR d."organizationId" = $1)' +
  ' AND ($2::text IS NULL OR d.channel = $2::"DonationChannel")' +
  ' AND ($3::text IS NULL OR d.status = $3::"DonationStatus")';

export async function fetchAllDonations(
  orgId: string | null,
  channel: string | null,
  status: string | null,
  take: number,
  skip: number
): Promise<{ rows: DonationRow[]; total: number }> {
  const selectSql =
    'SELECT d.id, d.amount::float8 AS amount, d.channel::text, d.status::text,' +
    ' d."donatedAt", d."senderPhone", dn.name AS "donorName",' +
    ' o.name AS "orgName", c.title AS "campaignTitle"' +
    ' FROM "Donation" d' +
    ' LEFT JOIN "Donor" dn ON d."donorId" = dn.id' +
    ' LEFT JOIN "Organization" o ON d."organizationId" = o.id' +
    ' LEFT JOIN "Campaign" c ON d."campaignId" = c.id' +
    ' WHERE ' + WHERE +
    ' ORDER BY d."donatedAt" DESC LIMIT ' + take + ' OFFSET ' + skip;

  const countSql =
    'SELECT COUNT(*) AS count FROM "Donation" d WHERE ' + WHERE;

  const [rawRows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(selectSql, orgId, channel, status),
    prisma.$queryRawUnsafe(countSql, orgId, channel, status),
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
    total: Number((countRows as any[])[0].count),
  };
}
