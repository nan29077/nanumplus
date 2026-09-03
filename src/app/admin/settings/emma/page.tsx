/**
 * EMMA 연동 상태 관리 페이지
 * /admin/settings/emma
 *
 * - EMMA 설정 상태 표시
 * - 최근 MO 수신 내역 확인
 * - 크론 수동 실행 버튼
 */

import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtKst, ymKst } from "@/lib/kst-date";
import { maskPhone } from "@/lib/masking";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmmaRunCronButton } from "@/components/admin/emma-run-cron-button";
import { EmmaSetupPanel } from "@/components/admin/emma-setup-panel";
import { MtGlobalSwitch } from "@/components/admin/mt-global-switch";
import { getMtGlobalConfig, countMtEnabledOrgs } from "@/lib/messaging";
import { getEmmaClient } from "@/lib/emma/client";
import {
  MessageSquare, CheckCircle2, AlertCircle, Clock3,
  Cpu, Database, Send, ArrowLeft, Table2,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEmmaSettingsPage() {
  const user = await requireSuperAdmin();

  const provider = process.env.INFOBANK_PROVIDER ?? "mock";
  const emmaId = process.env.EMMA_ID ?? "";
  const emmaCronSecret = !!(process.env.EMMA_CRON_SECRET);
  const mtSender = process.env.INFOBANK_MT_SENDER_NUMBER ?? "";
  const emmaDbUrl = process.env.EMMA_DB_URL ?? "";
  const isLive = provider === "live" && !!emmaId;

  // 최근 문자후원(EMMA MO 처리) Donation 내역
  const recentDonations = await prisma.donation.findMany({
    where: { channel: "SMS", providerName: "infobank-emma", deletedAt: null },
    orderBy: { donatedAt: "desc" },
    take: 10,
    select: {
      id: true, amount: true, status: true, donatedAt: true,
      senderPhone: true, smsBody: true, providerTransactionId: true,
      organization: { select: { name: true, smsFullNumber: true } },
    },
  });

  // EMMA DB 테이블 진단
  const suffix = ymKst(); // KST 기준 YYYYMM
  const emmaClient = getEmmaClient();
  let emmaTableExists = false;
  let emmaUnprocessed = 0;
  let emmaTableError: string | null = null;
  try {
    const exists = await emmaClient.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      `em_mo_log_${suffix}`
    );
    emmaTableExists = exists[0].exists;
    if (emmaTableExists) {
      const cnt = await emmaClient.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) AS count FROM em_mo_log_${suffix} WHERE msg_status IN ('3', '0')`
      );
      emmaUnprocessed = Number(cnt[0].count);
    }
  } catch (err) {
    emmaTableError = err instanceof Error ? err.message : String(err);
  }

  // 감사 문자 전역 설정 / 기관 켜짐 현황
  const [mtGlobal, mtOrgs] = await Promise.all([getMtGlobalConfig(), countMtEnabledOrgs()]);

  // MT 발송 큐(em_smt_tran) 진단 — EMMA가 실제로 집어가는 테이블은 여기다.
  // (기존 화면은 em_mt_log_YYYYMM 을 보고 있어 2026-08-26 장애를 전혀 잡아내지 못했다)
  let mtQueueExists = false;
  let mtQueueWaiting = 0;
  let mtQueueTotal = 0;
  let mtQueueError: string | null = null;
  try {
    const ex = await emmaClient.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT to_regclass('public.em_smt_tran') IS NOT NULL AS exists`
    );
    mtQueueExists = ex[0].exists;
    if (mtQueueExists) {
      const cnt = await emmaClient.$queryRawUnsafe<[{ waiting: bigint; total: bigint }]>(
        `SELECT count(*) FILTER (WHERE msg_status = '1') AS waiting, count(*) AS total FROM em_smt_tran`
      );
      mtQueueWaiting = Number(cnt[0].waiting);
      mtQueueTotal = Number(cnt[0].total);
    }
  } catch (err) {
    mtQueueError = err instanceof Error ? err.message : String(err);
  }

  // 총 문자후원 현황
  const [smsTotalCount, smsTotalAmount] = await Promise.all([
    prisma.donation.count({
      where: { channel: "SMS", providerName: "infobank-emma", status: "COMPLETED", deletedAt: null },
    }),
    prisma.donation.aggregate({
      where: { channel: "SMS", providerName: "infobank-emma", status: "COMPLETED", deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const StatusRow = ({
    label, value, ok, icon: Icon,
  }: { label: string; value: string; ok: boolean; icon: typeof Cpu }) => (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-stone-600">
        <Icon className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-800">{value || "—"}</span>
        {ok
          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
          : <AlertCircle className="h-4 w-4 text-amber-400" strokeWidth={2} />
        }
      </div>
    </div>
  );

  return (
    <AdminLayout userName={user.name}>
      <Link href="/admin/settings" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 설정
      </Link>
      <PageHeader
        title="EMMA 문자후원 연동"
        description="인포뱅크 EMMA 에이전트 연동 상태를 확인합니다."
        action={
          isLive
            ? <Badge tone="green">실연동 활성</Badge>
            : <Badge tone="amber">Mock 모드</Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <StatCard icon={MessageSquare} label="EMMA 처리 건수" value={smsTotalCount.toLocaleString("ko-KR")} unit="건" color="brand" />
        <StatCard icon={CheckCircle2} label="누적 후원금액" value={((smsTotalAmount._sum.amount ?? 0) / 10000).toFixed(1)} unit="만원" color="emerald" />
        <StatCard icon={Clock3} label="최근 수신" value={recentDonations[0] ? fmtKst(recentDonations[0].donatedAt, "M/d HH:mm") : "없음"} unit="" color="amber" />
      </div>

      {/* 감사 문자 발송 제어 */}
      <div className="mb-4">
        <MtGlobalSwitch
          initialEnabled={mtGlobal.enabled}
          initialEnabledOrgs={mtOrgs.enabled}
          initialTotalOrgs={mtOrgs.total}
          unavailable={mtGlobal.unavailable}
        />
      </div>

      {/* 설정 상태 */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-stone-900">EMMA 설정 상태</h2>
          </div>
          <div>
            <StatusRow label="INFOBANK_PROVIDER" value={provider} ok={provider === "live"} icon={MessageSquare} />
            <StatusRow label="EMMA_ID" value={emmaId} ok={!!emmaId} icon={Cpu} />
            <StatusRow
              label="감사문자 전역 마스터"
              value={mtGlobal.enabled ? "발송 중" : "중단"}
              ok={mtGlobal.enabled}
              icon={Send}
            />
            <StatusRow label="EMMA DB URL" value={emmaDbUrl ? "별도 설정됨" : "DATABASE_URL 공유"} ok={true} icon={Database} />
            <StatusRow label="크론 시크릿" value={emmaCronSecret ? "설정됨" : "미설정 (인증 없음)"} ok={emmaCronSecret} icon={CheckCircle2} />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-stone-900">MO 처리 크론</h2>
            </div>
            <EmmaRunCronButton />
          </div>
          <div className="text-sm text-stone-600 space-y-2">
            <p>크론 엔드포인트: <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">/api/cron/emma-mo</code></p>
            <p>권장 실행 주기: <b>1분</b></p>
            <p className="text-stone-400 text-xs mt-3">
              <code className="rounded bg-stone-100 px-1 py-0.5">setup-emma-cron.bat</code>를 관리자 권한으로 실행하면 작업 스케줄러에 자동 등록됩니다.
            </p>
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
              {isLive
                ? "✓ EMMA 연동이 활성화되어 있습니다. 크론이 1분마다 MO를 수신합니다."
                : "⚠ Mock 모드입니다. .env에서 INFOBANK_PROVIDER=live, EMMA_ID 설정 후 서버를 재시작하세요."
              }
            </div>
          </div>
        </div>
      </div>

      {/* 최근 MO 수신 내역 */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">최근 EMMA 수신 내역</h2>
          <span className="ml-auto text-xs text-stone-400">최근 10건</span>
        </div>
        {recentDonations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="h-10 w-10 text-stone-200 mb-3" strokeWidth={1.5} />
            <p className="text-stone-400 text-sm">아직 EMMA를 통한 문자후원 수신 내역이 없습니다.</p>
            <p className="text-stone-300 text-xs mt-1">연동 설정 완료 후 후원자가 문자를 보내면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">수신일시</th>
                  <th className="pb-2 font-medium">기관</th>
                  <th className="pb-2 font-medium">발신번호</th>
                  <th className="pb-2 font-medium">문자 내용</th>
                  <th className="pb-2 font-medium text-right">금액</th>
                  <th className="pb-2 font-medium text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recentDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50">
                    <td className="py-2.5 text-xs text-stone-500 whitespace-nowrap">
                      {fmtKst(d.donatedAt, "MM/dd HH:mm")}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="text-stone-800 font-medium">
                        {d.organization?.name ?? "기관배정 없음"}
                      </div>
                      <div className="text-xs text-stone-400">
                        {d.organization?.smsFullNumber ?? "—"}
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-stone-600 whitespace-nowrap tabular-nums">
                      {d.senderPhone ? maskPhone(d.senderPhone) : "—"}
                    </td>
                    <td className="py-2.5 max-w-[180px] truncate text-xs text-stone-500">
                      {d.smsBody || "—"}
                    </td>
                    <td className="py-2.5 text-right font-medium text-stone-800 whitespace-nowrap">
                      {d.amount.toLocaleString("ko-KR")}원
                    </td>
                    <td className="py-2.5 text-center">
                      {d.status === "COMPLETED"
                        ? <Badge tone="green">완료</Badge>
                        : <Badge tone="red">실패</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EMMA DB 테이블 진단 */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Table2 className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">EMMA DB 테이블 상태</h2>
          <span className="ml-auto text-xs text-stone-400">em_mo_log_{suffix}</span>
        </div>
        {emmaTableError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold mb-1">DB 연결 오류</p>
            <p className="text-xs font-mono">{emmaTableError}</p>
            <p className="mt-2 text-xs text-rose-500">
              EMMA가 별도 DB를 사용하는 경우 .env에 EMMA_DB_URL을 설정하세요.
            </p>
          </div>
        ) : (
          <EmmaSetupPanel
            tableExists={emmaTableExists}
            unprocessed={emmaUnprocessed}
            suffix={suffix}
          />
        )}
      </div>

      {/* MT 발송 큐 상태 — 실제 EMMA가 폴링하는 테이블 */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-4 w-4 text-brand-500" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-stone-900">MT 발송 큐 상태</h2>
          <span className="ml-auto text-xs text-stone-400">em_smt_tran</span>
        </div>
        {mtQueueError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold mb-1">큐 조회 오류</p>
            <p className="text-xs font-mono">{mtQueueError}</p>
          </div>
        ) : !mtQueueExists ? (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold mb-1">발송 큐 테이블이 없습니다</p>
            <p className="text-xs">
              EMMA가 감사 문자를 집어갈 <code className="rounded bg-rose-100 px-1">em_smt_tran</code> 테이블이
              존재하지 않습니다. 이 상태에서는 감사 문자가 한 통도 발송되지 않습니다.
            </p>
            <p className="mt-2 text-xs text-rose-500">
              조치: 고아 시퀀스(sq_em_smt_tran_01) 잔존 여부를 확인하고, 필요 시 제거 후 EMMA를 재기동하세요.
              (db:push 실행 후 db:emma 미실행이 원인인 경우가 많습니다)
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-stone-50 px-4 py-3">
              <p className="text-xs text-stone-400">발송 대기 (msg_status=1)</p>
              <p className="mt-1 text-xl font-bold text-stone-900">
                {mtQueueWaiting.toLocaleString("ko-KR")}<span className="ml-1 text-sm font-normal text-stone-400">건</span>
              </p>
            </div>
            <div className="rounded-xl bg-stone-50 px-4 py-3">
              <p className="text-xs text-stone-400">큐 전체</p>
              <p className="mt-1 text-xl font-bold text-stone-900">
                {mtQueueTotal.toLocaleString("ko-KR")}<span className="ml-1 text-sm font-normal text-stone-400">건</span>
              </p>
            </div>
            {mtQueueWaiting > 0 && (
              <div className="sm:col-span-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
                대기 건이 계속 줄지 않으면 EMMA의 MT 프로세스(mtsender·smtcollector)가 꺼져 있거나
                emma_id 가 맞지 않는 것입니다. EMMA 로그를 확인하세요.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 설치 가이드 */}
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">EMMA 연동 설치 가이드</h3>
        <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
          <li>인포뱅크 EMMA 에이전트를 서버에 설치하고 PostgreSQL DB를 연결합니다.</li>
          <li><code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">emma-setup.bat</code>을 실행해 DB에 EMMA 테이블을 생성합니다.</li>
          <li>.env 파일에서 <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">INFOBANK_PROVIDER=live</code>, <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">EMMA_ID</code>, <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">INFOBANK_MT_SENDER_NUMBER</code>를 설정합니다.</li>
          <li>나눔플러스 서버를 재시작합니다.</li>
          <li><code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">setup-emma-cron.bat</code>를 관리자 권한으로 실행하면 1분마다 자동 처리됩니다.</li>
        </ol>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon, label, value, unit, color,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: string;
  unit: string;
  color: "brand" | "emerald" | "amber";
}) {
  const colorMap = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-stone-900">
        {value} <span className="text-sm font-normal text-stone-400">{unit}</span>
      </p>
    </div>
  );
}
