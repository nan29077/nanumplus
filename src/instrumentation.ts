/**
 * Next.js 기동 훅 (next.config.mjs 의 experimental.instrumentationHook 필요).
 * 서버가 요청을 받기 전에 필수 환경변수를 검증한다.
 * 검증에 실패하면 예외를 던져 잘못된 설정으로 기동되는 것을 막는다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateEnv } = await import("./lib/env");
  validateEnv();
}
