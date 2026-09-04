/**
 * 환경변수 중앙 검증 · 실행 환경 판별.
 *
 * 목적
 *  1) 필수 환경변수(DATABASE_URL / NEXTAUTH_SECRET 등)가 빠진 채로 기동되는 것을 막는다.
 *  2) "mock 어댑터"가 운영 환경에서 실제 후원 레코드를 만들지 못하도록 판별 기준을 한곳에 모은다.
 *
 * 실제 검증 호출 지점은 `src/instrumentation.ts` (Next.js 기동 훅) 이다.
 *
 * APP_ENV 값 (없으면 NODE_ENV 로 추정)
 *  - local       : 개발자 PC. mock 결제 허용.
 *  - development : 공용 개발 서버. mock 결제 허용.
 *  - staging     : 준운영. mock 결제 차단.
 *  - production  : 운영. mock 결제 차단 + 필수 환경변수 미설정 시 기동 차단.
 */

export type AppEnv = "local" | "development" | "staging" | "production";

const APP_ENVS: readonly AppEnv[] = ["local", "development", "staging", "production"];

/** 값이 비어 있으면 undefined 로 정규화 */
export function envValue(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function appEnv(): AppEnv {
  const explicit = envValue("APP_ENV")?.toLowerCase() as AppEnv | undefined;
  if (explicit && APP_ENVS.includes(explicit)) return explicit;
  return process.env.NODE_ENV === "production" ? "production" : "local";
}

/** 운영/준운영 여부 — 보안 기본값을 강하게 적용해야 하는 환경 */
export function isProductionRuntime(): boolean {
  const e = appEnv();
  return e === "production" || e === "staging";
}

/** 필수 환경변수 조회 — 없으면 즉시 예외 */
export function requireEnv(name: string): string {
  const v = envValue(name);
  if (!v) {
    throw new Error(
      `[env] 필수 환경변수 ${name} 가 설정되지 않았습니다. .env 를 확인하세요.`
    );
  }
  return v;
}

/**
 * mock 결제 어댑터로 COMPLETED 후원 레코드를 생성해도 되는 환경인가.
 * 운영/준운영에서는 인증 없는 공개 API 가 즉시 완료 후원을 만들 수 있으므로 반드시 false.
 */
export function mockPaymentsAllowed(): boolean {
  const e = appEnv();
  return e === "local" || e === "development";
}

/** 어느 환경에서나 반드시 필요한 값 */
const REQUIRED_ALWAYS = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

/** 운영/준운영에서 추가로 필요한 값 */
const REQUIRED_PRODUCTION = ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"] as const;

/** 검증 결과 — 치명(기동 차단) / 경고(로그만) */
export type EnvCheck = { fatal: string[]; warn: string[] };

export function collectEnvIssues(): EnvCheck {
  const fatal: string[] = [];
  const warn: string[] = [];
  const prod = isProductionRuntime();

  for (const key of REQUIRED_ALWAYS) {
    if (!envValue(key)) fatal.push(`${key} 미설정`);
  }

  if (prod) {
    for (const key of REQUIRED_PRODUCTION) {
      if (!envValue(key)) fatal.push(`${key} 미설정 (운영 필수)`);
    }
    const secret = envValue("NEXTAUTH_SECRET");
    if (secret && (secret.length < 32 || secret.includes("change-me"))) {
      fatal.push("NEXTAUTH_SECRET 이 기본값이거나 32자 미만입니다 (openssl rand -base64 32)");
    }
  }

  // 온기(ONGI) 내통장결제 — 콜백 ref 서명 시크릿
  // dev-secret 폴백을 제거했으므로 ONGI_CALLBACK_SECRET 또는 NEXTAUTH_SECRET 중 하나는 반드시 필요.
  if (envValue("ONGI_PROVIDER") === "live") {
    if (!envValue("ONGI_CALLBACK_SECRET")) {
      fatal.push("ONGI_CALLBACK_SECRET 미설정 (ONGI_PROVIDER=live 시 필수)");
    }
    if (!envValue("ONGI_QR_CODE")) {
      fatal.push("ONGI_QR_CODE 미설정 (ONGI_PROVIDER=live 시 필수)");
    }
  } else if (prod && !envValue("ONGI_CALLBACK_SECRET")) {
    warn.push("ONGI_CALLBACK_SECRET 미설정 — NEXTAUTH_SECRET 으로 대체 서명합니다.");
  }

  // 인포뱅크(EMMA) 문자후원 실연동
  if (envValue("INFOBANK_PROVIDER") === "live" && !envValue("EMMA_ID")) {
    fatal.push("EMMA_ID 미설정 (INFOBANK_PROVIDER=live 시 필수)");
  }

  // 운영에서 mock 결제가 열려 있으면 인증 없는 API 가 완료 후원을 만들 수 있다.
  if (prod && envValue("APP_ENV")?.toLowerCase() === "local") {
    warn.push(
      "APP_ENV=local 로 mock 결제가 열려 있습니다. 운영에서는 반드시 제거하세요."
    );
  }

  return { fatal, warn };
}

let validated = false;

/** 기동 시 1회 호출 — 치명 오류가 있으면 예외를 던져 기동을 막는다. */
export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const { fatal, warn } = collectEnvIssues();

  for (const w of warn) console.warn(`[env] 경고: ${w}`);

  if (fatal.length) {
    const msg = [
      "[env] 환경변수 검증 실패 — 기동을 중단합니다.",
      ...fatal.map((f) => `  - ${f}`),
      "  .env / .env.example 을 확인하세요.",
    ].join("\n");
    throw new Error(msg);
  }
}
