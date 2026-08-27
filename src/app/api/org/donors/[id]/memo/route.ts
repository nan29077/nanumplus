import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { sanitizeText } from "@/lib/sanitize";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

const MAX_MEMO_LEN = 2000;

/** 메모 저장 남용 방지: 계정당 1분에 60회 */
const SAVE_LIMIT = 60;
const SAVE_WINDOW_MS = 60_000;

const schema = z.object({
  memo: z.string().max(MAX_MEMO_LEN * 2, "메모가 너무 깁니다.").nullable().optional(),
});

/**
 * 후원자 담당자 메모 저장.
 * 본인 기관 소속 후원자만 수정할 수 있으며, 저장 내용은 감사 로그에 남긴다.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;
  const orgId = auth.user.organizationId!;

  if (!rateLimit(`donor-memo:${auth.user.id}`, SAVE_LIMIT, SAVE_WINDOW_MS)) {
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  }

  // 태그·제어문자를 제거하고 길이를 제한한다. 빈 문자열은 null로 저장.
  const cleaned = sanitizeText(parsed.data.memo ?? "", MAX_MEMO_LEN);
  const memo = cleaned.length > 0 ? cleaned : null;

  // 타 기관 후원자 ID로 메모를 덮어쓰지 못하도록 기관 스코프로 먼저 확인
  const donor = await prisma.donor.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
    select: { id: true, memo: true },
  });
  if (!donor) return Response.json({ error: "후원자를 찾을 수 없습니다." }, { status: 404 });

  if (donor.memo === memo) {
    return Response.json({ ok: true, memo, unchanged: true });
  }

  await prisma.donor.update({ where: { id: donor.id }, data: { memo } });

  await writeAuditLog({
    userId: auth.user.id,
    action: "DONOR_MEMO_UPDATE",
    entityType: "Donor",
    entityId: donor.id,
    // 메모 원문은 개인정보가 섞일 수 있어 길이만 기록한다
    detail: { organizationId: orgId, length: memo?.length ?? 0, cleared: memo === null },
    ipAddress: getClientIp(req.headers),
  });

  return Response.json({ ok: true, memo });
}

/** POST 별칭 — 처리 내용은 PATCH와 동일 */
export const POST = PATCH;
