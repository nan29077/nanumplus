import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { campaignSchema } from "@/lib/campaign-schema";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";

async function ownedCampaign(id: string, orgId: string) {
  return prisma.campaign.findFirst({ where: { id, organizationId: orgId, deletedAt: null } });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const c = await ownedCampaign(params.id, auth.user.organizationId!);
  if (!c) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ campaign: c });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const existing = await ownedCampaign(params.id, orgId);
  if (!existing) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = campaignSchema.partial().safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const d = parsed.data;

  const start = d.startDate ? new Date(`${d.startDate}T00:00:00+09:00`) : undefined;
  const end = d.endDate ? new Date(`${d.endDate}T23:59:59+09:00`) : undefined;
  if (start && end && end < start) {
    return Response.json({ error: "종료일은 시작일 이후여야 합니다." }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...(d.title !== undefined ? { title: sanitizeText(d.title, 120) } : {}),
      ...(d.coverImageUrl !== undefined ? { coverImageUrl: d.coverImageUrl || null } : {}),
      ...(d.goalAmount !== undefined ? { goalAmount: d.goalAmount } : {}),
      ...(start ? { startDate: start } : {}),
      ...(end ? { endDate: end } : {}),
      ...(d.summary !== undefined ? { summary: d.summary ? sanitizeText(d.summary, 300) : null } : {}),
      ...(d.story !== undefined ? { story: d.story ? sanitizeText(d.story, 8000) : null } : {}),
      ...(d.reason !== undefined ? { reason: d.reason ? sanitizeText(d.reason, 3000) : null } : {}),
      ...(d.usagePlan !== undefined ? { usagePlan: d.usagePlan ? sanitizeText(d.usagePlan, 3000) : null } : {}),
      ...(d.beneficiary !== undefined ? { beneficiary: d.beneficiary ? sanitizeText(d.beneficiary, 500) : null } : {}),
      ...(d.messageToDonors !== undefined ? { messageToDonors: d.messageToDonors ? sanitizeText(d.messageToDonors, 1000) : null } : {}),
      ...(d.allowedChannels !== undefined ? { allowedChannels: JSON.stringify(d.allowedChannels) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.isPublished !== undefined ? { isPublished: d.isPublished } : {}),
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "CAMPAIGN_UPDATE",
    entityType: "Campaign",
    entityId: params.id,
    detail: { title: updated.title },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, campaign: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  const existing = await ownedCampaign(params.id, orgId);
  if (!existing) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  await prisma.campaign.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isPublished: false },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "CAMPAIGN_DELETE",
    entityType: "Campaign",
    entityId: params.id,
    detail: { title: existing.title },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true });
}
