import { apiAuth } from "@/lib/rbac";
import { getMonthlyCalendar, getDonationsOfDay } from "@/services/calendar";
import { nowKst } from "@/lib/kst-date";

export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const scope = { organizationId: auth.user.organizationId! };

  const url = new URL(req.url);
  const now = nowKst();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const date = url.searchParams.get("date");

  const days = await getMonthlyCalendar(scope, year, month);
  const dayDonations = date ? await getDonationsOfDay(scope, date) : [];
  return Response.json({ year, month, days, dayDonations });
}
