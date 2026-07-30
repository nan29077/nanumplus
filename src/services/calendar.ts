import { prisma } from "@/lib/prisma";
import { fmtKst, kstMonthRange } from "@/lib/kst-date";

type Scope = { organizationId?: string };

export type CalendarDay = {
  date: string; // yyyy-MM-dd (KST)
  total: number;
  sms: number;
  easy: number;
  recurring: number;
  count: number;
};

/** 월간 캘린더: 날짜별 합계 + 채널 구분 (KST 기준) */
export async function getMonthlyCalendar(scope: Scope, year: number, month: number) {
  const { from, to, days } = kstMonthRange(year, month);
  const rows = await prisma.donation.findMany({
    where: {
      ...scope,
      status: "COMPLETED",
      deletedAt: null,
      donatedAt: { gte: from, lte: to },
    },
    select: { amount: true, channel: true, donatedAt: true },
  });

  const map = new Map<string, CalendarDay>();
  for (const d of days) {
    // days는 KST 벽시계 기준 Date — 로컬 필드로 직접 포맷
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const k = `${y}-${m}-${dd}`;
    map.set(k, { date: k, total: 0, sms: 0, easy: 0, recurring: 0, count: 0 });
  }
  for (const r of rows) {
    const key = fmtKst(r.donatedAt, "yyyy-MM-dd");
    const day = map.get(key);
    if (!day) continue;
    day.total += r.amount;
    day.count += 1;
    if (r.channel === "SMS") day.sms += r.amount;
    else if (r.channel === "EASY_TRANSFER") day.easy += r.amount;
    else day.recurring += r.amount;
  }
  return Array.from(map.values());
}

/** 특정 날짜(KST)의 후원 상세 리스트 */
export async function getDonationsOfDay(scope: Scope, dateStr: string) {
  const from = new Date(`${dateStr}T00:00:00+09:00`);
  const to = new Date(`${dateStr}T23:59:59.999+09:00`);
  return prisma.donation.findMany({
    where: { ...scope, deletedAt: null, donatedAt: { gte: from, lte: to } },
    include: {
      donor: { select: { name: true, phone: true } },
      organization: { select: { name: true } },
      campaign: { select: { title: true } },
    },
    orderBy: { donatedAt: "desc" },
  });
}
