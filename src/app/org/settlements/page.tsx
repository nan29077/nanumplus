import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OrgSettlementClient } from "@/components/org/org-settlement-client";
import { AlertTriangle, Terminal } from "lucide-react";

export const dynamic = "force-dynamic";

function MigrationNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-amber-900">DB 마이그레이션이 필요합니다</p>
          <p className="mt-1 text-sm text-amber-800">관리자에게 문의해 주세요.</p>
          <div className="mt-3 rounded-xl bg-stone-900 px-5 py-4">
            <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
              <Terminal className="h-3.5 w-3.5" strokeWidth={1.75} />
              터미널 (나눔플러스 폴더)
            </div>
            <pre className="text-sm text-emerald-400 whitespace-pre-wrap">{`npx prisma db push --accept-data-loss
npx prisma generate`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function OrgSettlementsPage({
  searchParams,
}: { searchParams: { view?: string; period?: string; status?: string } }) {
  const user = await requireOrgAdmin();

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, bankName: true, bankAccount: true, bankHolder: true },
  });

  let settlements: Awaited<ReturnType<typeof prisma.settlement.findMany>> = [];
  let migrationNeeded = false;

  try {
    settlements = await prisma.settlement.findMany({
      where: {
        organizationId: user.organizationId,
        ...(searchParams.status ? { status: searchParams.status as never } : {}),
        ...(searchParams.period ? { period: searchParams.period } : {}),
      },
      include: { _count: { select: { items: true } } },
      orderBy: { scheduledDate: "desc" },
    });
  } catch {
    migrationNeeded = true;
  }

  // 월별 집계
  const monthlyMap: Record<string, {
    period: string;
    pendingAmt: number; completedAmt: number; processingAmt: number;
    pending: number; completed: number; processing: number; cancelled: number;
    totalItems: number;
  }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settlements.forEach((s: any) => {
    const p = s.period as string;
    if (!monthlyMap[p]) {
      monthlyMap[p] = {
        period: p,
        pendingAmt: 0, completedAmt: 0, processingAmt: 0,
        pending: 0, completed: 0, processing: 0, cancelled: 0,
        totalItems: 0,
      };
    }
    const m = monthlyMap[p];
    m.totalItems += s._count.items;
    if (s.status === "PENDING") { m.pending++; m.pendingAmt += s.netAmount; }
    else if (s.status === "PROCESSING") { m.processing++; m.processingAmt += s.netAmount; }
    else if (s.status === "COMPLETED") { m.completed++; m.completedAmt += s.netAmount; }
    else if (s.status === "CANCELLED") m.cancelled++;
  });
  const monthlyList = Object.values(monthlyMap).sort((a, b) => b.period.localeCompare(a.period));

  const totalPending = settlements
    .filter((s: { status: string }) => ["PENDING", "PROCESSING"].includes(s.status))
    .reduce((sum: number, s: { netAmount: number }) => sum + s.netAmount, 0);
  const totalCompleted = settlements
    .filter((s: { status: string }) => s.status === "COMPLETED")
    .reduce((sum: number, s: { netAmount: number }) => sum + s.netAmount, 0);
  const nextSettlement = settlements.find((s: { status: string }) => s.status === "PENDING");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized = settlements.map((s: any) => ({
    id: s.id,
    period: s.period,
    scheduledDate: s.scheduledDate instanceof Date ? s.scheduledDate.toISOString() : String(s.scheduledDate),
    netAmount: s.netAmount,
    feeAmount: s.feeAmount,
    totalAmount: s.totalAmount,
    status: s.status,
    processedAt: s.processedAt instanceof Date ? s.processedAt.toISOString() : (s.processedAt ?? null),
    bankName: s.bankName,
    bankAccount: s.bankAccount,
    bankHolder: s.bankHolder,
    note: s.note ?? null,
    donationCount: s._count.items,
  }));

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader
        title="정산 관리"
        description="매월 16일 기준 정산 — SMS 후원 +3개월, 나머지 다음 달 16일."
      />

      {migrationNeeded ? (
        <MigrationNotice />
      ) : (
        <OrgSettlementClient
          settlements={serialized}
          monthlyList={monthlyList}
          orgBank={{
            name: org?.bankName ?? null,
            account: org?.bankAccount ?? null,
            holder: org?.bankHolder ?? null,
          }}
          stats={{
            totalPending,
            totalCompleted,
            nextDate:
              nextSettlement?.scheduledDate instanceof Date
                ? nextSettlement.scheduledDate.toISOString()
                : (nextSettlement?.scheduledDate ?? null),
          }}
          defaultView={searchParams.view ?? "monthly"}
          defaultPeriod={searchParams.period ?? ""}
          defaultStatus={searchParams.status ?? ""}
        />
      )}
    </OrgLayout>
  );
}
