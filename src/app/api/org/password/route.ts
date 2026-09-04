import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import { rateLimit, isRateLimited } from "@/lib/rate-limit";

/** 현재 비밀번호 오입력 제한: 계정당 10분에 10회 */
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 60_000 * 10;

const schema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요."),
  newPassword: z.string().min(8, "새 비밀번호는 8자 이상이어야 합니다.").max(72),
});

/** 기관 관리자: 본인 비밀번호 변경 (현재 비밀번호 확인 후 변경) */
export async function PATCH(req: Request) {
  const auth = await apiAuth("ORG_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return Response.json({ error: "새 비밀번호가 현재 비밀번호와 동일합니다." }, { status: 400 });
  }

  // 현재 비밀번호 무차별 대입 방지
  const rlKey = `pw-change-fail:${auth.user.id}`;
  if (isRateLimited(rlKey, FAIL_LIMIT)) {
    return Response.json(
      { error: "비밀번호 확인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) return Response.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  if (!user.passwordHash) {
    return Response.json(
      { error: "비밀번호가 설정되지 않은 계정입니다. 최고 관리자에게 문의해 주세요." },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    rateLimit(rlKey, FAIL_LIMIT, FAIL_WINDOW_MS);
    return Response.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  // 비밀번호를 바꾸면 기존에 발급된 JWT 를 전부 무효화한다(tokenVersion +1).
  // 초기 비밀번호 강제 변경 플래그도 함께 해제한다.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashed,
      passwordChangeRequired: false,
      tokenVersion: { increment: 1 },
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "ORG_ADMIN_PASSWORD_CHANGE",
    entityType: "User",
    entityId: user.id,
    detail: { organizationId: auth.user.organizationId, email: user.email },
    ipAddress: getClientIp(req.headers),
  });

  // 기존 토큰이 무효화되었으므로 클라이언트는 재로그인해야 한다.
  return Response.json({ ok: true, reauthRequired: true });
}

/**
 * POST 별칭 — 클라이언트/문서에 따라 POST로 호출하는 경우를 함께 지원한다.
 * 검증·감사 로그 등 처리 내용은 PATCH와 완전히 동일하다.
 */
export const POST = PATCH;
