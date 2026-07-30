import { apiAuth, orgScope } from "@/lib/rbac";
import { getMonthlyCalendar, getDonationsOfDay } from "@/services/calendar";
import { nowKst } from "@/lib/kst-date";

/** 관리자 캘린더 (기관 필터 가능) */
export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const now = nowKst();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const date = url.searchParams.get("date");
  const scope = orgScope(auth.user, orgId);

  const days = await getMonthlyCalendar(scope, year, month);
  const dayDonations = date ? await getDonationsOfDay(scope, date) : [];

  return Response.json({ year, month, days, dayDonations });
}
