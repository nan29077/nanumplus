/**
 * EMMA MO 수신 처리 크론 엔드포인트
 *
 * GET /api/cron/emma-mo
 *
 * 호출 방법:
 *  - Windows 작업 스케줄러로 1분마다 호출 (emma-cron.bat 참조)
 *  - 또는 외부 크론 서비스 (ex. cron-job.org) 에서 호출
 *
 * 보안:
 *  - EMMA_CRON_SECRET 환경변수가 설정된 경우 Authorization 헤더 또는
 *    ?secret= 쿼리 파라미터로 검증
 *  - 미설정 시 로컬 환경 전용으로 간주하고 허용
 *
 * INFOBANK_PROVIDER=live 이고 EMMA_ID가 설정된 경우에만 실제 처리.
 */

import { NextRequest, NextResponse } from "next/server";
import { processEmmaMo } from "@/lib/emma";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel 환경 시 최대 실행 시간(초)

export async function GET(req: NextRequest) {
  // 보안 검증
  const cronSecret = process.env.EMMA_CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const provided = authHeader?.replace("Bearer ", "") ?? querySecret ?? "";

    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // EMMA 활성화 여부 확인
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
    const elapsed = Date.now() - startAt;

    return NextResponse.json({
      ok: true,
      elapsed_ms: elapsed,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/emma-mo] 처리 오류:", err);
    return NextResponse.json(
      { ok: false, error: message, elapsed_ms: Date.now() - startAt },
      { status: 500 }
    );
  }
}
