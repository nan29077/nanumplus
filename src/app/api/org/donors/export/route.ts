import { apiAuth } from "@/lib/rbac";
import { maskPhone, maskEmail } from "@/lib/masking";
import { writeAuditLog } from "@/lib/audit";
import { fmtKst } from "@/lib/kst-date";
import { getClientIp } from "@/lib/validation";
import { resolveDonorStatus } from "@/lib/donor-status";
import { parseDonorQuery, fetchOrgDonors, type DonorListItem } from "@/lib/donor-query";

/** 한 번에 읽어올 행 수 / 전체 상한 (메모리 폭주 방지) */
const BATCH_SIZE = 500;
const MAX_ROWS = 50_000;

/**
 * 후원자 목록 CSV 다운로드 (개인정보 보호를 위해 연락처/이메일 마스킹).
 * 목록 화면과 동일한 검색·필터·정렬 조건(q, type, status, period, from, to, sort)을 지원하며,
 * 아무 조건도 없으면 기관의 전체 후원자를 등록일 최신순으로 내보낸다.
 */
export async function GET(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const url = new URL(req.url);
  const query = parseDonorQuery(url.searchParams);
  // 하위 호환: sort를 지정하지 않으면 기존 CSV와 동일하게 등록일 최신순
  if (!url.searchParams.get("sort")) query.sort = "created";
  query.pageSize = BATCH_SIZE;

  const donors: DonorListItem[] = [];
  let page = 1;
  let total = 0;
  // 전체 결과를 페이지 단위로 모은다 (상한 도달 시 중단)
  for (;;) {
    const result = await fetchOrgDonors(orgId, { ...query, page });
    total = result.total;
    donors.push(...result.rows);
    if (result.rows.length < BATCH_SIZE || page >= result.totalPages || donors.length >= MAX_ROWS) break;
    page += 1;
  }

  const now = new Date();
  const header = [
    "이름", "연락처(마스킹)", "이메일(마스킹)", "상태", "정기후원",
    "첫 후원일", "최근 후원일", "후원건수", "누적후원액", "등록일",
  ];
  const lines = donors.map((d) => {
    const status = resolveDonorStatus(
      {
        activeRecurring: d.activeRecurring,
        recurringTotal: d.recurringTotal,
        lastDonatedAt: d.lastDonatedAt,
      },
      now
    );
    return [
      d.name,
      maskPhone(d.phone),
      maskEmail(d.email),
      status.label,
      d.activeRecurring > 0 ? "예" : "아니오",
      d.firstDonatedAt ? fmtKst(d.firstDonatedAt, "yyyy-MM-dd") : "",
      d.lastDonatedAt ? fmtKst(d.lastDonatedAt, "yyyy-MM-dd") : "",
      String(d.donationCount),
      String(d.totalAmount),
      fmtKst(d.createdAt, "yyyy-MM-dd"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 부착
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");

  await writeAuditLog({
    userId: auth.user.id,
    action: "DONOR_EXPORT",
    entityType: "Organization",
    entityId: orgId,
    detail: {
      count: donors.length,
      matched: total,
      filters: {
        q: query.q || null,
        type: query.type,
        status: query.status,
        period: query.period,
        from: query.from || null,
        to: query.to || null,
      },
    },
    ipAddress: getClientIp(req.headers),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donors_${fmtKst(new Date(), "yyyyMMdd")}.csv"`,
    },
  });
}
