import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst } from "@/lib/kst-date";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  ORGANIZATION_CREATE: "기관 등록",
  ORGANIZATION_UPDATE: "기관 수정",
  ORGANIZATION_DELETE: "기관 삭제",
  SMS_CODE_ASSIGN: "문자번호 부여",
  QR_CODE_REGENERATE: "QR 재발급",
  CAMPAIGN_CREATE: "캠페인 생성",
  CAMPAIGN_UPDATE: "캠페인 수정",
  CAMPAIGN_DELETE: "캠페인 삭제",
  DONOR_EXPORT: "후원자 내보내기",
  ORGANIZATION_SELF_UPDATE: "기관 정보 수정(기관관리자)",
  ORGANIZATION_BANK_ACCOUNT_CHANGE: "정산계좌 변경",
  ORG_ADMIN_PASSWORD_CHANGE: "기관관리자 비밀번호 변경",
  ORG_ADMIN_PASSWORD_RESET: "기관관리자 비밀번호 초기화",
};

/** 계좌 변경처럼 별도로 눈에 띄어야 하는 작업 */
const ALERT_ACTIONS = new Set(["ORGANIZATION_BANK_ACCOUNT_CHANGE", "ORG_ADMIN_PASSWORD_RESET"]);

export default async function AdminAuditLogsPage() {
  const user = await requireSuperAdmin();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="감사 로그" description="주요 관리 작업의 이력입니다. (최근 100건)" />
      {logs.length === 0 ? (
        <EmptyState title="기록된 로그가 없습니다" />
      ) : (
        <DataTable headers={["일시", "수행자", "작업", "대상", "상세"]}>
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-stone-50/60">
              <td className="whitespace-nowrap px-4 py-3 text-stone-500">{fmtKst(l.createdAt, "yyyy-MM-dd HH:mm")}</td>
              <td className="px-4 py-3 text-stone-700">{l.user?.name ?? "시스템"}</td>
              <td className="px-4 py-3">
                <Badge tone={ALERT_ACTIONS.has(l.action) ? "red" : "blue"}>
                  {ACTION_LABEL[l.action] ?? l.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-stone-500">{l.entityType ?? "-"}</td>
              <td className="px-4 py-3 text-xs text-stone-400">
                {l.detail ? JSON.stringify(l.detail) : "-"}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminLayout>
  );
}
