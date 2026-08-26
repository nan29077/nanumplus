import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/validation";

/**
 * 클라이언트 에러 바운더리 신고 수집.
 *
 * error.tsx(digest만 보이는 화면)에서 발생 시각·경로·digest·메시지를 서버에 남겨
 * "오류 코드: XXXX"만으로는 원인 추적이 불가능한 문제를 해결한다.
 * 로그는 logs/client-errors.log 에 JSONL로 적재된다.
 */

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "client-errors.log");

const clip = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  // IP당 분당 10회 + 전체 분당 100회(스푸핑된 XFF로도 무한 적재 불가)
  if (!rateLimit(`client-error:${ip}`, 10, 60_000) || !rateLimit("client-error:all", 100, 60_000)) {
    return Response.json({ ok: false }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const entry = {
    at: new Date().toISOString(),
    ip,
    boundary: clip(body.boundary, 20),
    digest: clip(body.digest, 40),
    path: clip(body.path, 300),
    message: clip(body.message, 1000),
    userAgent: clip(req.headers.get("user-agent"), 200),
  };

  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // 로깅 실패는 무시 (사용자 화면에 영향 없음)
  }
  return Response.json({ ok: true });
}
