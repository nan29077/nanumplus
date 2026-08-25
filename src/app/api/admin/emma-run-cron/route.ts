/**
 * EMMA 크론 수동 실행 (SUPER_ADMIN 전용)
 * GET /api/admin/emma-run-cron
 *
 * H-5: 이전 구현은 X-Forwarded-Host / Host 헤더로 자기 자신의 URL을 만들어
 * /api/cron/emma-mo 를 다시 호출했다. 두 헤더 모두 클라이언트가 조작할 수 있어
 * EMMA_CRON_SECRET이 담긴 Authorization 헤더를 임의의 외부 호스트로 보낼 수 있었다.
 * HTTP 왕복 자체를 없애고 processEmmaMo()를 서버에서 직접 호출한다.
 * (부수적으로 크론 시크릿 없이도 동작하며, 네트워크 왕복 비용도 사라진다)
 */
import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/rbac";
import { processEmmaMo } from "@/lib/emma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  // 크론 엔드포인트와 동일한 활성화 조건
  const emmaId = process.env.EMMA_ID;
  const provider = process.env.INFOBANK_PROVIDER;
  if (provider !== "live" || !emmaId) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "EMMA 비활성 (INFOBANK_PROVIDER=live, EMMA_ID 설정 필요)",
    });
  }

  const startAt = Date.now();
  try {
    const result = await processEmmaMo();
    return NextResponse.json({
      ok: true,
      elapsed_ms: Date.now() - startAt,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/emma-run-cron] 처리 오류:", err);
    return NextResponse.json(
      { ok: false, error: message, elapsed_ms: Date.now() - startAt },
      { status: 500 }
    );
  }
}
