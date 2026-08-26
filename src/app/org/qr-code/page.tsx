import { headers } from "next/headers";
import { requireOrgAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { donatePageUrl, ensureOrgQrCode } from "@/lib/qr";
import { OrgLayout } from "@/components/layout/org-layout";
import { PageHeader } from "@/components/layout/page-header";
import { QRCodeCard } from "@/components/donation/qr-code-card";

export const dynamic = "force-dynamic";

export default async function OrgQrCodePage() {
  const user = await requireOrgAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, name: true, slug: true, qrCodeUrl: true, smsFullNumber: true },
  });

  // 요청 헤더에서 실제 host 추출 → QR 코드가 로컬 네트워크에서도 작동하도록
  const reqHeaders = await headers();
  const host = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host") ?? "localhost:3005";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  // 미발급 기관은 조회 시점에 즉시 발급한다.
  const qrImageDataUrl = org
    ? await ensureOrgQrCode({ id: org.id, slug: org.slug, qrCodeUrl: org.qrCodeUrl })
    : null;

  return (
    <OrgLayout userName={user.name} orgName={org?.name ?? "기관"}>
      <PageHeader title="QR 코드" description="후원 페이지로 연결되는 QR 코드를 내려받아 홍보물에 활용하세요." />
      <QRCodeCard
        imageDataUrl={qrImageDataUrl}
        targetUrl={donatePageUrl(org?.slug ?? "", baseUrl)}
        orgName={org?.name ?? "기관"}
        regenerateEndpoint="/api/org/qr-code/regenerate"
      />
      {org?.smsFullNumber && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold text-stone-900">문자후원 번호</h2>
          <p className="mt-2 text-2xl font-bold tracking-wide text-brand-700">{org.smsFullNumber}</p>
          <p className="mt-1 text-sm text-stone-500">후원자가 이 번호로 문자를 보내면 우리 기관에 후원이 전달됩니다.</p>
        </div>
      )}
    </OrgLayout>
  );
}
