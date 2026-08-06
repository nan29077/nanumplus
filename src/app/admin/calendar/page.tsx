import { requireSuperAdmin, orgScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getMonthlyCalendar, getDonationsOfDay } from "@/services/calendar";
import { nowKst, fmtKst } from "@/lib/kst-date";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/donation/filter-bar";
import { DonationCalendar, type DayDonationRow } from "@/components/donation/donation-calendar";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: { searchParams: { orgId?: string; year?: string; month?: string; date?: string } }) {
  const user = await requireSuperAdmin();
  const now = nowKst();
  // year/month 쿼리 파라미터 검증 — 잘못된 값(NaN, 범위 밖)은 현재 날짜로 폴백
  const rawYear = Number(searchParams.year);
  const rawMonth = Number(searchParams.month);
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
    ? rawYear : now.getFullYear();
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
    ? rawMonth : now.getMonth() + 1;
  const scope = orgScope(user, searchParams.orgId);

  const [days, dayDonations, orgs] = await Promise.all([
    getMonthlyCalendar(scope, year, month),
    searchParams.date ? getDonationsOfDay(scope, searchParams.date) : Promise.resolve([]),
    prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const rows: DayDonationRow[] = dayDonations.map((d) => ({
    id: d.id,
    amount: d.amount,
    channel: d.channel,
    status: d.status,
    donatedAt: fmtKst(d.donatedAt, "HH:mm"),
    donorName: d.donor?.name ?? "익명",
    organizationName: d.organization?.name,
    campaignTitle: d.campaign?.title ?? null,
  }));

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="후원 캘린더" description="날짜별 모금액과 채널 구성을 확인하세요." />
      <FilterBar orgs={orgs.map((o) => ({ value: o.id, label: o.name }))} showChannel={false} showStatus={false} />
      <DonationCalendar year={year} month={month} days={days} selectedDate={searchParams.date} dayDonations={rows} />
    </AdminLayout>
  );
}
