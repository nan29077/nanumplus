import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Users, Megaphone, Mail, Phone, MapPin } from "lucide-react";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { donatePageUrl, ensureOrgQrCode } from "@/lib/qr";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SmsCodeAssign } from "@/components/admin/sms-code-assign";
import { QRCodeCard } from "@/components/donation/qr-code-card";
import { OrgFeeClient } from "@/components/admin/org-fee-client";
import { OrgEditDelete } from "@/components/admin/org-edit-delete";
import { OrgResetPassword } from "@/components/admin/org-reset-password";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireSuperAdmin();

  const org = await prisma.organization.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      admins: { include: { user: { select: { name: true, email: true } } } },
      smsAssignments: { orderBy: { assignedAt: "desc" }, take: 5 },
      donations: { where: { status: "COMPLETED", deletedAt: null }, select: { amount: true } },
      _count: { select: { donors: { where: { deletedAt: null } }, campaigns: { where: { deletedAt: null } } } },
    },
  });
  if (!org) notFound();

  const total = org.donations.reduce((s: number, d: { amount: number }) => s + d.amount, 0);
  const admin = org.admins[0]?.user;

  // 수수료 설정 로드
  const CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"] as const;
  let fees: { channel: string; feePercent: number; isDefault: boolean }[] = [];
  try {
    const dbFees = await prisma.organizationFee.findMany({
      where: { organizationId: org.id },
      select: { channel: true, feePercent: true },
    });
    const feeMap = new Map(dbFees.map((f) => [f.channel, f.feePercent]));
    fees = CHANNELS.map((ch) => ({
      channel: ch,
      feePercent: feeMap.get(ch) ?? 5.0,
      isDefault: !feeMap.has(ch),
    }));
  } catch {
    fees = CHANNELS.map((ch) => ({ channel: ch, feePercent: 5.0, isDefault: true }));
  }

  // QR 코드: 마이그레이션으로 등록된 기관은 미발급 상태이므로 조회 시점에 즉시 발급한다.
  const qrImageDataUrl = await ensureOrgQrCode({
    id: org.id,
    slug: org.slug,
    qrCodeUrl: org.qrCodeUrl,
  });

  return (
    <AdminLayout userName={user.name}>
      <Link href="/admin/organizations" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 기관 목록
      </Link>
      <PageHeader
        title={org.name}
        description={`/donate/${org.slug}`}
        action={org.isActive ? <Badge tone="green">운영 중</Badge> : <Badge tone="red">비활성</Badge>}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="누적 모금액" value={total} icon={Wallet} />
        <StatCard label="후원자" value={org._count.donors} icon={Users} unit="count" />
        <StatCard label="캠페인" value={org._count.campaigns} icon={Megaphone} unit="count" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-stone-900">문자후원 번호 부여</h2>
          <p className="mt-1 text-sm text-stone-500">
            현재 번호:{" "}
            {org.smsFullNumber ? <b className="text-brand-700">{org.smsFullNumber}</b> : <span className="text-stone-400">미부여</span>}
          </p>
          <div className="mt-4">
            <SmsCodeAssign orgId={org.id} currentCode={org.smsCode} />
          </div>
          {org.smsAssignments.length > 0 && (
            <div className="mt-5 border-t border-stone-100 pt-4">
              <p className="text-xs font-medium text-stone-400">부여 이력</p>
              <ul className="mt-2 space-y-1.5">
                {org.smsAssignments.map((a: { id: string; fullNumber: string; assignedAt: Date; isActive: boolean }) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-700">{a.fullNumber}</span>
                    <span className="flex items-center gap-2 text-xs text-stone-400">
                      {fmtKst(a.assignedAt, "yyyy-MM-dd")}
                      {a.isActive ? <Badge tone="green">사용 중</Badge> : <Badge tone="gray">해제</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-stone-900">기관 정보</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-stone-600"><Mail className="h-4 w-4 text-stone-400" strokeWidth={1.75} />{org.email ?? "-"}</div>
            <div className="flex items-center gap-2 text-stone-600"><Phone className="h-4 w-4 text-stone-400" strokeWidth={1.75} />{org.phone ?? "-"}</div>
            <div className="flex items-center gap-2 text-stone-600"><MapPin className="h-4 w-4 text-stone-400" strokeWidth={1.75} />{org.address ?? "-"}</div>
          </dl>
          <div className="mt-4 rounded-xl bg-stone-50 p-4">
            <p className="text-xs font-medium text-stone-400">기관 관리자 계정</p>
            {admin ? (
              <p className="mt-1 text-sm text-stone-700">{admin.name} · {admin.email}</p>
            ) : (
              <p className="mt-1 text-sm text-stone-400">관리자 미지정</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <QRCodeCard
          imageDataUrl={qrImageDataUrl}
          targetUrl={donatePageUrl(org.slug)}
          orgName={org.name}
          regenerateEndpoint={`/api/admin/organizations/${org.id}/qr-code`}
        />
      </div>

      <div className="mt-4">
        <OrgFeeClient orgId={org.id} initialFees={fees} />
      </div>

      <div className="mt-4">
        <OrgResetPassword orgId={org.id} />
      </div>

      <OrgEditDelete
        orgId={org.id}
        initialName={org.name}
        initialEmail={org.email ?? null}
        initialPhone={org.phone ?? null}
        initialAddress={org.address ?? null}
        initialDescription={org.description ?? null}
        initialIsActive={org.isActive}
      />
    </AdminLayout>
  );
}
