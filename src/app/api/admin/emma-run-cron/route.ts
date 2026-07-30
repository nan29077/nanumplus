/**
 * EMMA 크론 수동 실행 프록시 (SUPER_ADMIN 전용)
 * GET /api/admin/emma-run-cron
 *
 * 브라우저에서 직접 /api/cron/emma-mo를 호출하면 EMMA_CRON_SECRET 검증을 통과할 수 없으므로
 * 서버에서 인증 헤더를 붙여 프록시한다.
 */
import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await apiAuth("SUPER_ADMIN");
  if ("error" in auth) return auth.error;

  const cronSecret = process.env.EMMA_CRON_SECRET;
  const headers: Record<string, string> = {};
  if (cronSecret) {
    headers["Authorization"] = `Bearer ${cronSecret}`;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3005";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const cronUrl = `${proto}://${host}/api/cron/emma-mo`;

  try {
    const res = await fetch(cronUrl, { method: "GET", headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
