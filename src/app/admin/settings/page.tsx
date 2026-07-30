import Link from "next/link";
import { requireSuperAdmin } from "@/lib/rbac";
import { MessageSquare, Landmark, ShieldCheck, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireSuperAdmin();
  const infobank = process.env.INFOBANK_PROVIDER ?? "mock";
  const onki = process.env.ONKI_PROVIDER ?? "mock";

  const emmaId = process.env.EMMA_ID ?? "";
  const isEmmaLive = infobank === "live" && !!emmaId;

  const ProviderRow = ({
    icon: Icon, name, desc, mode, href,
  }: { icon: typeof MessageSquare; name: string; desc: string; mode: string; href?: string }) => (
    <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-semibold text-stone-900">{name}</p>
          <p className="mt-0.5 text-sm text-stone-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={mode === "live" ? "green" : "amber"}>{mode === "live" ? "실연동" : "Mock"}</Badge>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50">
            <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
            상세
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout userName={user.name}>
      <PageHeader title="설정" description="외부 연동 및 시스템 환경을 확인합니다." />

      <div className="space-y-3">
        <ProviderRow icon={MessageSquare} name="인포뱅크 문자후원 (EMMA)" mode={infobank} href="/admin/settings/emma"
          desc={isEmmaLive
            ? `EMMA DB 폴링 방식 연동 활성 (ID: ${emmaId})`
            : "문자(#2540) 후원 EMMA 에이전트 연동. INFOBANK_PROVIDER=live + EMMA_ID 설정 필요."
          } />
        <ProviderRow icon={Landmark} name="온기 간편 계좌이체 / 정기후원" mode={onki}
          desc="간편 계좌이체·정기후원 결제 연동. .env의 ONKI_PROVIDER 로 전환합니다." />
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">보안 · 운영 정책</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-stone-600">
          <li>· 모든 관리 화면은 로그인 및 역할 기반 접근 제어(RBAC)로 보호됩니다.</li>
          <li>· 기관 관리자는 본인 기관 데이터만 조회·관리할 수 있습니다.</li>
          <li>· 후원자 연락처·이메일은 목록과 내보내기에서 마스킹되어 표시됩니다.</li>
          <li>· 주요 작업(기관/문자번호/QR/캠페인)은 감사 로그에 기록됩니다.</li>
          <li>· 후원 일시는 한국 표준시(KST) 기준으로 집계됩니다.</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
