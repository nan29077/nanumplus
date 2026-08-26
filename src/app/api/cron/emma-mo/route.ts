/**
 * EMMA MO 수신 처리 크론 엔드포인트
 *
 * GET /api/cron/emma-mo
 *
 * 호출 방법:
 *  - Windows 작업 스케줄러로 1분마다 호출 (emma-cron.bat 참조)
 *  - 또는 외부 크론 서비스 (ex. cron-job.org) 에서 호출
 *
 * 보안 (M-1):
 *  - EMMA_CRON_SECRET 환경변수가 반드시 설정되어야 합니다.
 *  - Authorization: Bearer <secret> 헤더 또는 ?secret= 쿼리 파라미터로 검증.
 *  - 미설정 시 서버 설정 오류로 간주하여 모든 요청을 거부합니다.
 *    (빈 문자열로 인증을 우회하는 버그 방지)
 *
 * INFOBANK_PROVIDER=live 이고 EMMA_ID가 설정된 경우에만 실제 처리.
 */

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processEmmaMo } from "@/lib/emma";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel 환경 시 최대 실행 시간(초)

export async function GET(req: NextRequest) {
  // M-1: EMMA_CRON_SECRET 미설정 시 무조건 거부 (빈 문자열 인증 우회 방지)
  const cronSecret = process.env.EMMA_CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "EMMA_CRON_SECRET이 설정되지 않았습니다. 환경변수를 확인해 주세요." },
      { status: 500 }
    );
  }

  // 시크릿은 Authorization 헤더로만 받는다.
  // (?secret= 쿼리 방식은 액세스 로그·프록시 로그에 평문으로 남아 제거)
  const authHeader = req.headers.get("authorization");
  const provided = authHeader?.replace("Bearer ", "") ?? "";

  // 문자열 길이 비교로 끝나지 않도록 timing-safe 비교 (웹훅 핸들러와 동일 정책)
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(cronSecret);
  const match =
    providedBuf.length === secretBuf.length &&
    timingSafeEqual(providedBuf, secretBuf);

  if (!match) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
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
