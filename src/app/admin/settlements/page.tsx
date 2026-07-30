import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { AdminSettlementClient } from "@/components/admin/admin-settlement-client";
import { AlertTriangle, Terminal } from "lucide-react";

export const dynamic = "force-dynamic";

function MigrationNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-amber-900">DB 마이그레이션이 필요합니다</p>
          <p className="mt-1 text-sm text-amber-800">
            정산 기능을 사용하려면 아래 명령어를 프로젝트 폴더에서 실행해 주세요.
          </p>
          <div className="mt-3 rounded-xl bg-stone-900 px-5 py-4">
            <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
              <Terminal className="h-3.5 w-3.5" strokeWidth={1.75} />
              터미널 (나눔플러스 폴더)
            </div>
            <pre className="text-sm text-emerald-400 whitespace-pre-wrap leading-relaxed">{`npx prisma db push --accept-data-loss
npx prisma generate`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: {
    view?: string;    // "monthly" | "list"
    status?: string;
    orgId?: string;
    period?: string;  // "2026-04"
    month?: string;   // "2026-04" (월별 뷰에서 선택한 달)
  };
}) {
  const user = await requireSuperAdmin();

  let organizations: { id: string; name: string; bankName: string | null; bankAccount: string | null; bankHolder: string | null }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let settlements: any[] = [];
  let migrationNeeded = false;

  try {
    [organizations, settlements] = await Promise.all([
      prisma.organization.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, bankName: true, bankAccount: true, bankHolder: true },
        orderBy: { name: "asc" },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).settlement.findMany({
        where: {
          ...(searchParams.status ? { status: searchParams.status } : {}),
          ...(searchParams.orgId ? { organizationId: searchParams.orgId } : {}),
          ...(searchParams.period ? { period: searchParams.period } : {}),
        },
        include: {
          organization: {
            select: { id: true, name: true, bankName: true, bankAccount: true, bankHolder: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: [{ scheduledDate: "desc" }, { organizationId: "asc" }],
      }),
    ]);
  } catch {
    migrationNeeded = true;
    try {
      organizations = await prisma.organization.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, bankName: true, bankAccount: true, bankHolder: true },
        orderBy: { name: "asc" },
      });
    } catch { /* ignore */ }
  }

  // 월별 집계 (period 기준)
  const monthlyMap: Record<string, {
    period: string;
    pending: number; processing: number; completed: number; cancelled: number;
    pendingAmt: number; processingAmt: number; completedAmt: number;
    orgCount: number; totalItems: number;
  }> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settlements.forEach((s: any) => {
    const p = s.period as string;
    if (!monthlyMap[p]) {
      monthlyMap[p] = {
        period: p,
        pending: 0, processing: 0, completed: 0, cancelled: 0,
        pendingAmt: 0, processingAmt: 0, completedAmt: 0,
        orgCount: 0, totalItems: 0,
      };
    }
    const m = monthlyMap[p];
    m.orgCount++;
    m.totalItems += s._count.items;
    if (s.status === "PENDING") { m.pending++; m.pendingAmt += s.netAmount; }
    else if (s.status === "PROCESSING") { m.processing++; m.processingAmt += s.netAmount; }
    else if (s.status === "COMPLETED") { m.completed++; m.completedAmt += s.netAmount; }
    else if (s.status === "CANCELLED") { m.cancelled++; }
  });

  const monthlyList = Object.values(monthlyMap).sort((a, b) => b.period.localeCompare(a.period));
  const periods = monthlyList.map((m) => m.period);

  const allStats = {
    totalPending: settlements.filter((s: { status: string }) => s.status === "PENDING").reduce((sum: number, s: { netAmount: number }) => sum + s.netAmount, 0),
    totalProcessing: settlements.filter((s: { status: string }) => s.status === "PROCESSING").reduce((sum: number, s: { netAmount: number }) => sum + s.netAmount, 0),
    totalCompleted: settlements.filter((s: { status: string }) => s.status === "COMPLETED").reduce((sum: number, s: { netAmount: number }) => sum + s.netAmount, 0),
    countPending: settlements.filter((s: { status: string }) => s.status === "PENDING").length,
    countProcessing: settlements.filter((s: { status: string }) => s.status === "PROCESSING").length,
    countCompleted: settlements.filter((s: { status: string }) => s.status === "COMPLETED").length,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedSettlements = settlements.map((s: any) => ({
    id: s.id,
    period: s.period,
    scheduledDate: s.scheduledDate instanceof Date ? s.scheduledDate.toISOString() : String(s.scheduledDate),
    totalAmount: s.totalAmount,
    feeAmount: s.feeAmount,
    netAmount: s.netAmount,
    status: s.status,
    processedAt: s.processedAt instanceof Date ? s.processedAt.toISOString() : (s.processedAt ?? null),
    bankName: s.bankName,
    bankAccount: s.bankAccount,
    bankHolder: s.bankHolder,
    note: s.note ?? null,
    donationCount: s._count.items,
    organization: s.organization,
  }));

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="정산 관리"
        description="기관별 후원금 정산을 처리합니다. SMS 후원 +3개월 16일, 나머지 다음달 16일 정산."
      />

      {migrationNeeded ? (
        <MigrationNotice />
      ) : (
        <AdminSettlementClient
          settlements={serializedSettlements}
          organizations={organizations}
          periods={periods}
          monthlyList={monthlyList}
          stats={allStats}
          defaultView={searchParams.view ?? "monthly"}
          defaultStatus={searchParams.status ?? ""}
          defaultOrgId={searchParams.orgId ?? ""}
          defaultPeriod={searchParams.period ?? ""}
        />
      )}
    </AdminLayout>
  );
}
