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

  // M-5: slug Race Condition 수정 — Prisma unique constraint 위반 시 재시도 패턴
  // 루프 사전 체크 방식은 두 요청이 동시에 같은 slug를 확인하면 중복 생성됨.
  // create 시 unique 제약 위반(P2002) 예외를 잡아 suffix를 증가시키며 재시도한다.
  const base = sanitizeSlug(d.title) || "campaign";
  let campaign: Awaited<ReturnType<typeof prisma.campaign.create>> | null = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt}`;
    try {
      campaign = await prisma.campaign.create({
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
      break; // 성공 시 루프 종료
    } catch (e: unknown) {
      // Prisma unique constraint violation (P2002) → slug 중복, 재시도
      const code = (e as { code?: string })?.code;
      if (code === "P2002" && attempt < 9) continue;
      return Response.json({ error: "캠페인 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
  }
  if (!campaign) {
    return Response.json({ error: "slug 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  await writeAuditLog({
    userId: auth.user.id,
    action: "CAMPAIGN_CREATE",
    entityType: "Campaign",
    entityId: campaign.id,
    detail: { title: campaign.title, slug: campaign.slug },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, campaignId: campaign.id, slug: campaign.slug });
}
