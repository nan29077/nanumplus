import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/donation/filter-bar";
import { SmsDonationGrid, type SmsDonationRow } from "@/components/donation/sms-donation-card";
import { SmsOrgSelect } from "@/components/admin/sms-org-select";
import { SMS_DONATION_AMOUNT } from "@/lib/validation";
import { periodRange } from "@/lib/kst-date";
import { MessageSquare, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

// Prisma 클라이언트가 아직 organizationId: String? 타입을 모르므로
// 기관배정 없음 필터는 raw SQL로 처리
const VALID_STATUSES = new Set(["COMPLETED", "FAILED", "PENDING"]);

export default async function Page({
  searchParams,
}: { searchParams: { orgId?: string; status?: string; page?: string } }) {
  const user = await requireSuperAdmin();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 18;

  const isUnassigned = searchParams.orgId === "__unassigned__";
  const validStatus =
    searchParams.status && VALID_STATUSES.has(searchParams.status)
      ? searchParams.status
      : null;

  const [orgs, monthTotal] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.donation.count({
      where: {
        deletedAt: null,
        channel: "SMS",
        status: "COMPLETED",
        donatedAt: {
          gte: periodRange("thisMonth").from, // KST 기준 이번 달 시작
        },
      },
    }),
  ]);

  let rows: SmsDonationRow[];
  let total: number;

  if (isUnassigned) {
    // organizationId IS NULL — Prisma ORM 타입 제한 우회
    const statusClause = validStatus
      ? `AND status = '${validStatus}'::"DonationStatus"`
      : "";
    const [rawRows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "smsBody", "senderPhone", "donatedAt",
                amount::float8 AS amount, status::text AS status, "recipientNumber"
         FROM "Donation"
         WHERE "deletedAt" IS NULL AND channel = 'SMS'::"DonationChannel" AND "organizationId" IS NULL ${statusClause}
         ORDER BY "donatedAt" DESC
         LIMIT $1 OFFSET $2`,
        take,
        (page - 1) * take
      ),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) AS count FROM "Donation"
         WHERE "deletedAt" IS NULL AND channel = 'SMS'::"DonationChannel" AND "organizationId" IS NULL ${statusClause}`
      ),
    ]);
    rows = rawRows.map((d) => ({
      id: d.id,
      smsBody: d.smsBody ?? null,
      senderPhone: d.senderPhone ?? null,
      donatedAt: new Date(d.donatedAt).toISOString(),
      amount: Number(d.amount),
      status: d.status,
      orgName: null,
      recipientNumber: d.recipientNumber ?? null,
    }));
    total = Number(countResult[0].count);
  } else if (searchParams.orgId) {
    // 특정 기관 필터 — organizationId가 항상 존재하므로 ORM 안전
    const where = {
      deletedAt: null,
      channel: "SMS" as const,
      organizationId: searchParams.orgId,
      ...(validStatus ? { status: validStatus as never } : {}),
    };
    const [donations, cnt] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { donatedAt: "desc" },
        skip: (page - 1) * take,
        take,
        include: { organization: { select: { name: true } } },
      }),
      prisma.donation.count({ where }),
    ]);
    rows = donations.map((d) => ({
      id: d.id,
      smsBody: d.smsBody ?? null,
      senderPhone: d.senderPhone ?? null,
      donatedAt: d.donatedAt.toISOString(),
      amount: Number(d.amount),
      status: d.status,
      orgName: d.organization?.name ?? null,
      recipientNumber: (d as any).recipientNumber ?? null,
    }));
    total = cnt;
  } else {
    // 필터 없음 — null-org SMS 포함 가능하므로 raw SQL 사용
    const statusClause = validStatus
      ? `AND d.status = '${validStatus}'::"DonationStatus"`
      : "";
    const [rawRows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT d.id, d."smsBody", d."senderPhone", d."donatedAt",
                d.amount::float8 AS amount, d.status::text AS status,
                d."recipientNumber", o.name AS "orgName"
         FROM "Donation" d
         LEFT JOIN "Organization" o ON d."organizationId" = o.id
         WHERE d."deletedAt" IS NULL AND d.channel = 'SMS'::"DonationChannel" ${statusClause}
         ORDER BY d."donatedAt" DESC LIMIT $1 OFFSET $2`,
        take,
        (page - 1) * take
      ),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) AS count FROM "Donation" d
         WHERE d."deletedAt" IS NULL AND d.channel = 'SMS'::"DonationChannel" ${statusClause}`
      ),
    ]);
    rows = rawRows.map((d) => ({
      id: d.id,
      smsBody: d.smsBody ?? null,
      senderPhone: d.senderPhone ?? null,
      donatedAt: new Date(d.donatedAt).toISOString(),
      amount: Number(d.amount),
      status: d.status,
      orgName: d.orgName ?? null,
      recipientNumber: d.recipientNumber ?? null,
    }));
    total = Number(countResult[0].count);
  }

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="문자후원 내역"
        description="전체 기관 문자후원(#2540) 기록입니다. 건당 3,000원 고정."
      />

      {/* 요약 배지 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
          <MessageSquare className="h-4 w-4 text-sky-600" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-medium text-sky-500">이달 전체 완료 건수</p>
            <p className="text-lg font-bold text-sky-700">{monthTotal.toLocaleString("ko-KR")}건</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
          <div>
            <p className="text-[11px] font-medium text-sky-500">이달 전체 모금액 (추정)</p>
            <p className="text-lg font-bold text-sky-700">
              {(monthTotal * SMS_DONATION_AMOUNT).toLocaleString("ko-KR")}원
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
          <Building2 className="h-4 w-4 text-stone-500" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-medium text-stone-500">전체 조회 건수</p>
            <p className="text-lg font-bold text-stone-800">{total.toLocaleString("ko-KR")}건</p>
          </div>
        </div>
      </div>

      {/* 필터 행 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* 기관 셀렉트박스 */}
        <SmsOrgSelect orgs={orgs} currentOrgId={searchParams.orgId} />

        {/* 상태 필터 */}
        <div className="flex gap-2 text-sm">
          {[
            { label: "전체", value: "" },
            { label: "완료", value: "COMPLETED" },
            { label: "대기", value: "PENDING" },
            { label: "실패", value: "FAILED" },
          ].map((f) => (
            <a
              key={f.value}
              href={`?orgId=${searchParams.orgId ?? ""}&status=${f.value}&page=1`}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                (searchParams.status ?? "") === f.value
                  ? "bg-brand-600 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>

      <SmsDonationGrid rows={rows} />
      <div className="mt-6">
        <Pagination total={total} page={page} pageSize={take} />
      </div>
    </AdminLayout>
  );
}
