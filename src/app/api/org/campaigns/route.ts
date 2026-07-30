import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText, sanitizeSlug } from "@/lib/sanitize";
import { campaignSchema } from "@/lib/campaign-schema";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

export async function GET() {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: auth.user.organizationId!, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { donations: true } } },
  });
  return Response.json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = campaignSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const d = parsed.data;

  const start = new Date(`${d.startDate}T00:00:00+09:00`);
  const end = new Date(`${d.endDate}T23:59:59+09:00`);
  if (end < start) return Response.json({ error: "종료일은 시작일 이후여야 합니다." }, { status: 400 });

  // 고유 slug 생성
  const base = sanitizeSlug(d.title) || "campaign";
  let slug = base;
  for (let i = 1; await prisma.campaign.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      title: sanitizeText(d.title, 120),
      slug,
      coverImageUrl: d.coverImageUrl || null,
      goalAmount: d.goalAmount,
      startDate: start,
      endDate: end,
      summary: d.summary ? sanitizeText(d.summary, 300) : null,
      story: d.story ? sanitizeText(d.story, 8000) : null,
      reason: d.reason ? sanitizeText(d.reason, 3000) : null,
      usagePlan: d.usagePlan ? sanitizeText(d.usagePlan, 3000) : null,
      beneficiary: d.beneficiary ? sanitizeText(d.beneficiary, 500) : null,
      messageToDonors: d.messageToDonors ? sanitizeText(d.messageToDonors, 1000) : null,
      allowedChannels: JSON.stringify(d.allowedChannels ?? ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"]),
      status: d.status ?? "DRAFT",
      isPublished: d.isPublished ?? false,
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "CAMPAIGN_CREATE",
    entityType: "Campaign",
    entityId: campaign.id,
    detail: { title: campaign.title, slug },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, campaignId: campaign.id, slug });
}
