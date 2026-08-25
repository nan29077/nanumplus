import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { resolveDonationPage } from "@/lib/donation-page";

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), heading: z.string().max(120).optional(), body: z.string().max(4000) }),
  z.object({ type: z.literal("image"), imageUrl: z.string().url(), caption: z.string().max(200).optional() }),
  z.object({ type: z.literal("quote"), body: z.string().max(600), author: z.string().max(60).optional() }),
]);

const schema = z.object({
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "테마 색상 형식이 올바르지 않습니다.").optional(),
  heroImageUrl: z.string().url("이미지 URL 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  heroTitle: z.string().max(80).optional().or(z.literal("")),
  heroSubtitle: z.string().max(160).optional().or(z.literal("")),
  introTitle: z.string().max(120).optional().or(z.literal("")),
  introBody: z.string().max(4000).optional().or(z.literal("")),
  blocks: z.array(blockSchema).max(20).optional(),
  suggestedAmounts: z.array(z.coerce.number().int().min(1000).max(100_000_000)).max(8).optional(),
  enabledChannels: z
    .array(z.enum(["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER", "RECURRING_CARD"]))
    .min(1, "최소 1개 이상의 후원 방법을 노출해야 합니다.")
    .optional(),
  thankYouTitle: z.string().max(80).optional().or(z.literal("")),
  thankYouMessage: z.string().max(1000).optional().or(z.literal("")),
  showStats: z.boolean().optional(),
  showCampaigns: z.boolean().optional(),
  showFaq: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET() {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;
  const row = await prisma.donationPage.findUnique({ where: { organizationId: orgId } });
  return Response.json({ config: resolveDonationPage(row) });
}

export async function PATCH(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." }, { status: 400 });
  const d = parsed.data;

  const clean = (v: string | undefined, max: number) =>
    v === undefined ? undefined : v ? sanitizeText(v, max) : null;

  const data = {
    ...(d.themeColor !== undefined ? { themeColor: d.themeColor } : {}),
    ...(d.heroImageUrl !== undefined ? { heroImageUrl: d.heroImageUrl || null } : {}),
    ...(d.heroTitle !== undefined ? { heroTitle: clean(d.heroTitle, 80) } : {}),
    ...(d.heroSubtitle !== undefined ? { heroSubtitle: clean(d.heroSubtitle, 160) } : {}),
    ...(d.introTitle !== undefined ? { introTitle: clean(d.introTitle, 120) } : {}),
    ...(d.introBody !== undefined ? { introBody: clean(d.introBody, 4000) } : {}),
    ...(d.blocks !== undefined ? { blocks: JSON.stringify(d.blocks) } : {}),
    ...(d.suggestedAmounts !== undefined ? { suggestedAmounts: JSON.stringify(d.suggestedAmounts) } : {}),
    ...(d.enabledChannels !== undefined ? { enabledChannels: JSON.stringify(d.enabledChannels) } : {}),
    ...(d.thankYouTitle !== undefined ? { thankYouTitle: clean(d.thankYouTitle, 80) } : {}),
    ...(d.thankYouMessage !== undefined ? { thankYouMessage: clean(d.thankYouMessage, 1000) } : {}),
    ...(d.showStats !== undefined ? { showStats: d.showStats } : {}),
    ...(d.showCampaigns !== undefined ? { showCampaigns: d.showCampaigns } : {}),
    ...(d.showFaq !== undefined ? { showFaq: d.showFaq } : {}),
    ...(d.isPublished !== undefined ? { isPublished: d.isPublished } : {}),
  };

  const row = await prisma.donationPage.upsert({
    where: { organizationId: orgId },
    update: data,
    create: { organizationId: orgId, ...data },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "DONATION_PAGE_UPDATE",
    entityType: "DonationPage",
    entityId: row.id,
    detail: { fields: Object.keys(data) },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, config: resolveDonationPage(row) });
}
