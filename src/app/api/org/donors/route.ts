import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { fmtKst } from "@/lib/kst-date";
import { maskPhone, maskEmail } from "@/lib/masking";
import { resolveDonorStatus } from "@/lib/donor-status";
import { parseDonorQuery, fetchOrgDonors, resolveDonorPeriod } from "@/lib/donor-query";

/**
 * 기관 후원자 목록 조회 (검색·필터·정렬·페이지네이션).
 * 본인 기관으로 스코프가 고정되며, 연락처/이메일은 마스킹해 응답한다.
 *
 * 쿼리: q, type, status, period, from, to, sort, page, pageSize
 */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const url = new URL(req.url);
  const query = parseDonorQuery(url.searchParams);
  const result = await fetchOrgDonors(orgId, query);
  const now = new Date();

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  const range = resolveDonorPeriod(query);

  return Response.json({
    organization: { id: orgId, name: org?.name ?? null },
    query: {
      ...query,
      periodFrom: range ? fmtKst(range.from, "yyyy-MM-dd") : null,
      periodTo: range ? fmtKst(range.to, "yyyy-MM-dd") : null,
    },
    summary: result.summary,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    donors: result.rows.map((d) => ({
      id: d.id,
      name: d.name,
      phone: maskPhone(d.phone),
      email: maskEmail(d.email),
      isRecurring: d.isRecurring,
      isLinked: d.isLinked,
      hasMemo: !!d.memo?.trim(),
      totalAmount: d.totalAmount,
      donationCount: d.donationCount,
      firstDonatedAt: d.firstDonatedAt ? fmtKst(d.firstDonatedAt, "yyyy-MM-dd") : null,
      lastDonatedAt: d.lastDonatedAt ? fmtKst(d.lastDonatedAt, "yyyy-MM-dd") : null,
      activeRecurring: d.activeRecurring,
      recurringTotal: d.recurringTotal,
      recurringAmount: d.activeRecurring > 0 ? d.activeRecurringAmount : null,
      status: resolveDonorStatus(
        {
          activeRecurring: d.activeRecurring,
          recurringTotal: d.recurringTotal,
          lastDonatedAt: d.lastDonatedAt,
        },
        now
      ),
      createdAt: fmtKst(d.createdAt, "yyyy-MM-dd"),
    })),
  });
}
