/**
 * 플랫폼 전역 설정 API (최고관리자 전용)
 *
 * GET   /api/admin/platform-settings  → 현재 전역 MT 설정 + 기관 켜짐 현황
 * PATCH /api/admin/platform-settings  → 전역 마스터 스위치 / 기본 발신번호 변경
 *
 * 전역 마스터를 켜는 것은 되돌릴 수 없는 결과(문자 발송)를 만들 수 있으므로
 * 변경은 반드시 감사 로그로 남긴다.
 */
import { z } from "zod";
import { apiAuth } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/validation";
import {
  PLATFORM_SETTING_KEYS,
  getMtGlobalConfig,
  setPlatformSetting,
  countMtEnabledOrgs,
} from "@/lib/messaging";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  mtEnabled: z.boolean().optional(),
});

export async function GET() {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const [config, orgs] = await Promise.all([getMtGlobalConfig(), countMtEnabledOrgs()]);
  return Response.json({ ok: true, config, orgs });
}

export async function PATCH(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;

  const before = await getMtGlobalConfig();
  if (before.unavailable) {
    return Response.json(
      {
        error:
          "PlatformSetting 테이블이 없습니다. 실서버에 prisma/sync-prod-20260903-mt-switch.sql 을 먼저 적용해 주세요.",
      },
      { status: 409 }
    );
  }

  try {
    if (d.mtEnabled !== undefined) {
      await setPlatformSetting(
        PLATFORM_SETTING_KEYS.MT_ENABLED,
        d.mtEnabled ? "true" : "false",
        auth.user.id
      );
    }
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "설정 저장 실패" },
      { status: 500 }
    );
  }

  if (d.mtEnabled !== undefined && d.mtEnabled !== before.enabled) {
    const orgs = await countMtEnabledOrgs();
    await writeAuditLog({
      userId: auth.user.id,
      action: d.mtEnabled ? "PLATFORM_MT_MASTER_ENABLE" : "PLATFORM_MT_MASTER_DISABLE",
      entityType: "PlatformSetting",
      entityId: PLATFORM_SETTING_KEYS.MT_ENABLED,
      detail: { before: before.enabled, after: d.mtEnabled, enabledOrgs: orgs.enabled, totalOrgs: orgs.total },
      ipAddress: getClientIp(req.headers),
    });
  }

  const [config, orgs] = await Promise.all([getMtGlobalConfig(), countMtEnabledOrgs()]);
  return Response.json({ ok: true, config, orgs });
}
