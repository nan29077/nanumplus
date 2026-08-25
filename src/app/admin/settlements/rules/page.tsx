import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettlementRulesClient, type SettlementRuleRow } from "@/components/admin/settlement-rules-client";
import { DEFAULT_SETTLEMENT_RULES } from "@/services/settlement";

export const dynamic = "force-dynamic";

const CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const;

export default async function SettlementRulesPage() {
  const user = await requireSuperAdmin();

  let rows: { channel: string; ruleType: string; offsetValue: number; anchorDay: number | null }[] = [];
  try {
    rows = await prisma.settlementRule.findMany();
  } catch {
    // 마이그레이션 전 — 기본값으로 표시
  }
  const byChannel = new Map(rows.map((r) => [r.channel, r]));

  const initial: SettlementRuleRow[] = CHANNELS.map((ch) => {
    const r = byChannel.get(ch);
    const def = DEFAULT_SETTLEMENT_RULES[ch];
    return {
      channel: ch,
      ruleType: (r?.ruleType as "DAYS" | "MONTHS") ?? (def.ruleType as "DAYS" | "MONTHS"),
      offsetValue: r?.offsetValue ?? def.offsetValue,
      anchorDay: r?.anchorDay ?? def.anchorDay,
      isCustom: !!r,
    };
  });

  return (
    <AdminLayout userName={user.name}>
      <Link href="/admin/settlements" className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> 정산 관리로
      </Link>
      <PageHeader
        title="정산주기 설정"
        description="후원 채널별로 기관 정산 시점을 정합니다. 문자후원은 후원일 기준 N일 후 등으로 설정할 수 있습니다."
      />
      <SettlementRulesClient initial={initial} />
    </AdminLayout>
  );
}
