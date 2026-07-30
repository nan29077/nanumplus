import Link from "next/link";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const user = await requireSuperAdmin();

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      admins: { include: { user: { select: { name: true, email: true } } } },
      donations: { where: { status: "COMPLETED", deletedAt: null }, select: { amount: true } },
      _count: { select: { donors: true, campaigns: true } },
    },
  });

  return (
    <AdminLayout userName={user.name}>
      <PageHeader
        title="기관 관리"
        description="후원 기관을 등록하고 문자후원 번호와 QR 코드를 관리합니다."
        action={
          <Link href="/admin/organizations/new"
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" strokeWidth={1.75} /> 기관 등록
          </Link>
        }
      />

      {orgs.length === 0 ? (
        <EmptyState title="등록된 기관이 없습니다" description="기관 등록 버튼으로 첫 기관을 추가해 보세요." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o) => {
            const total = o.donations.reduce((s: number, d: { amount: number }) => s + d.amount, 0);
            return (
              <Link key={o.id} href={`/admin/organizations/${o.id}`}
                className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-600">
                      {o.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </span>
                    <div>
                      <p className="font-semibold text-stone-900">{o.name}</p>
                      <p className="text-xs text-stone-400">/{o.slug}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-brand-500" strokeWidth={1.75} />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {o.smsFullNumber ? (
                    <Badge tone="blue">{o.smsFullNumber}</Badge>
                  ) : (
                    <Badge tone="gray">문자번호 미부여</Badge>
                  )}
                  {o.isActive ? <Badge tone="green">운영 중</Badge> : <Badge tone="red">비활성</Badge>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center">
                  <div>
                    <p className="text-xs text-stone-400">누적 모금</p>
                    <p className="mt-0.5 text-sm font-semibold text-brand-700">{formatKRW(total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">후원자</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800">{o._count.donors}명</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">캠페인</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800">{o._count.campaigns}개</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
