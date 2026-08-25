import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { DEFAULT_SETTLEMENT_RULES } from "@/services/settlement";

const CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"] as const;

const ruleSchema = z.object({
  channel: z.enum(CHANNELS),
  ruleType: z.enum(["DAYS", "MONTHS"]),
  offsetValue: z.coerce.number().int().min(0).max(365),
  anchorDay: z.coerce.number().int().min(1).max(28).nullable().optional(),
});
const bodySchema = z.object({ rules: z.array(ruleSchema).min(1).max(10) });

/** 현재 채널별 정산규칙 (DB값 + 기본값 병합) */
export async function GET() {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const rows = await prisma.settlementRule.findMany();
  const byChannel = new Map(rows.map((r) => [r.channel, r]));

  const rules = CHANNELS.map((ch) => {
    const r = byChannel.get(ch);
    const def = DEFAULT_SETTLEMENT_RULES[ch];
    return {
      channel: ch,
      ruleType: (r?.ruleType as string) ?? def.ruleType,
      offsetValue: r?.offsetValue ?? def.offsetValue,
      anchorDay: r?.anchorDay ?? def.anchorDay,
      isCustom: !!r,
    };
  });
  return Response.json({ rules });
}

/** 채널별 정산규칙 저장 (upsert) */
export async function PUT(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });

  for (const r of parsed.data.rules) {
    const anchorDay = r.ruleType === "MONTHS" ? (r.anchorDay ?? 16) : null;
    await prisma.settlementRule.upsert({
      where: { channel: r.channel },
      update: { ruleType: r.ruleType, offsetValue: r.offsetValue, anchorDay },
      create: { channel: r.channel, ruleType: r.ruleType, offsetValue: r.offsetValue, anchorDay },
    });
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "SETTLEMENT_RULE_UPDATE",
    entityType: "SettlementRule",
    detail: { rules: parsed.data.rules } as Record<string, unknown>,
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
