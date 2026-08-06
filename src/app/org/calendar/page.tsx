import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getMonthlyCalendar, getDonationsOfDay } from "@/services/calendar";
import { nowKst, fmtKst } from "@/lib/kst-date";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DonationCalendar, type DayDonationRow } from "@/components/donation/donation-calendar";

export const dynamic = "force-dynamic";

export default async function OrgCalendarPage({
  searchParams,
}: { searchParams: { year?: string; month?: string; date?: string } }) {
  const user = await requireOrgAdmin();
  const scope = { organizationId: user.organizationId };
  const now = nowKst();
  // year/month 쿼리 파라미터 검증 — 잘못된 값(NaN, 범위 밖)은 현재 날짜로 폴백
  const rawYear = Number(searchParams.year);
  const rawMonth = Number(searchParams.month);
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
    ? rawYear : now.getFullYear();
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
    ? rawMonth : now.getMonth() + 1;

  const [org, days, dayDonations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    getMonthlyCalendar(scope, year, month),
    searchParams.date ? getDonationsOfDay(scope, searchParams.date) : Promise.resolve([]),
  ]);

  const rows: DayDonationRow[] = dayDonations.map((d) => ({
    id: d.id,
    amount: d.amount,
    channel: d.channel,
    status: d.status,
    donatedAt: fmtKst(d.donatedAt, "HH:mm"),
    donorName: d.donor?.name ?? "익명",
    campaignTitle: d.campaign?.title ?? null,
  }));

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="후원 캘린더" description="날짜를 클릭하면 해당 일의 후원 상세 내역을 볼 수 있습니다." />
      <DonationCalendar year={year} month={month} days={days} selectedDate={searchParams.date} dayDonations={rows} />
    </OrgLayout>
  );
}
