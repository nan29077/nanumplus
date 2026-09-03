/**
 * 문자 발송(MT) 게이트 · 플랫폼 전역 설정
 *
 * 배경 (2026-09-03 점검):
 *  감사 문자 발송을 기관 단위로 제어할 수단이 없어, 전역 env 하나를 켜는 순간
 *  173개 기관 전체에 동시에 문자가 나가는 구조였다. 발송된 문자는 취소할 수 없다.
 *  → 2단 게이트를 둔다. 전역 마스터(최고관리자) AND 기관별 토글.
 *
 * 설계 원칙:
 *  1. Fail-closed — 설정을 읽지 못하면(테이블 미생성, DB 오류 등) 발송하지 않는다.
 *     "모르면 보낸다"가 아니라 "모르면 안 보낸다".
 *  2. 전역 마스터가 꺼져 있으면 기관 설정과 무관하게 전부 차단한다.
 *  3. 발신번호가 없으면 발송하지 않는다.
 *
 * 발신번호: 기관별로 반드시 설정해야 한다. 공용 번호 폴백은 없다.
 *   (전기통신사업법상 발신번호 사전등록제 — 미등록 번호는 발송이 거부된다)
 */

import { prisma } from "./prisma";

export const PLATFORM_SETTING_KEYS = {
  /** 감사 문자 전역 마스터 스위치 ("true" | "false") */
  MT_ENABLED: "sms.mt.enabled",
} as const;

export type PlatformSettingKey =
  (typeof PLATFORM_SETTING_KEYS)[keyof typeof PLATFORM_SETTING_KEYS];

/** 게이트 판정에 필요한 기관 정보 */
export type MtOrgInput = {
  id: string;
  name?: string;
  smsMtEnabled?: boolean | null;
  mtSenderNumber?: string | null;
};

export type MtGateResult =
  | { allowed: true; senderNumber: string }
  | { allowed: false; reason: string };

/* ───────────────────────── 플랫폼 설정 읽기/쓰기 ───────────────────────── */

/**
 * 설정값을 한 번에 조회한다.
 * PlatformSetting 테이블이 아직 없는 환경(증분 DDL 미적용)에서도 죽지 않고
 * 빈 값을 돌려준다 — 그 결과 게이트는 fail-closed 로 닫힌다.
 */
export async function getPlatformSettings(
  keys: readonly string[]
): Promise<Record<string, string>> {
  try {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, value: true },
    });
    return Object.fromEntries(
      rows.map((r: { key: string; value: string }) => [r.key, r.value])
    );
  } catch (err) {
    console.error(
      "[messaging] PlatformSetting 조회 실패 — 발송을 차단합니다:",
      err instanceof Error ? err.message : String(err)
    );
    return {};
  }
}

export async function setPlatformSetting(
  key: PlatformSettingKey,
  value: string,
  updatedById?: string | null
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedById: updatedById ?? null },
    update: { value, updatedById: updatedById ?? null },
  });
}

/* ───────────────────────── 전역 MT 설정 ───────────────────────── */

export type MtGlobalConfig = {
  /** 전역 마스터 스위치 */
  enabled: boolean;
  /** 설정을 읽지 못했는지 여부 — 화면 경고용 */
  unavailable: boolean;
};

export async function getMtGlobalConfig(): Promise<MtGlobalConfig> {
  const s = await getPlatformSettings([PLATFORM_SETTING_KEYS.MT_ENABLED]);
  const unavailable = !(PLATFORM_SETTING_KEYS.MT_ENABLED in s);
  return {
    enabled: s[PLATFORM_SETTING_KEYS.MT_ENABLED] === "true",
    unavailable,
  };
}

/* ───────────────────────── 게이트 판정 ───────────────────────── */

/**
 * 이 기관에 감사 문자를 보내도 되는지 판정한다.
 *
 * 반드시 큐에 넣기 전에 호출할 것. em_smt_tran 에 INSERT 된 뒤에는
 * EMMA가 집어가므로 되돌릴 수 없다.
 *
 * @param org 기관 정보 또는 기관 ID (ID를 넘기면 내부에서 조회)
 */
export async function resolveMtGate(
  org: MtOrgInput | string
): Promise<MtGateResult> {
  const global = await getMtGlobalConfig();

  if (global.unavailable) {
    return { allowed: false, reason: "전역 설정을 읽을 수 없음 (PlatformSetting 미적용)" };
  }
  if (!global.enabled) {
    return { allowed: false, reason: "전역 마스터 스위치 꺼짐" };
  }

  let target: MtOrgInput | null;
  if (typeof org === "string") {
    target = await prisma.organization.findFirst({
      where: { id: org, deletedAt: null },
      select: { id: true, name: true, smsMtEnabled: true, mtSenderNumber: true },
    });
  } else {
    target = org;
  }

  if (!target) {
    return { allowed: false, reason: "기관을 찾을 수 없음" };
  }
  if (!target.smsMtEnabled) {
    return { allowed: false, reason: "기관 스위치 꺼짐" };
  }

  /**
   * 발신번호는 기관별로 반드시 설정해야 한다. 공용 번호로 대신 나가지 않는다.
   *
   * 이유: 국내는 전기통신사업법상 **발신번호 사전등록제**가 적용된다.
   * 등록되지 않은 번호로는 발송이 거부되고, 기관 동의 없이 플랫폼 공용 번호로
   * 기관 이름의 문자를 보내면 회신·문의가 엉뚱한 곳으로 간다.
   * → 번호가 없으면 발송하지 않는다(폴백 없음).
   */
  const senderNumber = (target.mtSenderNumber ?? "").trim();

  if (!senderNumber) {
    return { allowed: false, reason: "기관 발신번호 미설정" };
  }

  return { allowed: true, senderNumber };
}

/** 화면 표시용 — 전체 기관 중 몇 곳이 켜져 있는지 */
export async function countMtEnabledOrgs(): Promise<{ enabled: number; total: number }> {
  try {
    const [enabled, total] = await Promise.all([
      prisma.organization.count({ where: { deletedAt: null, smsMtEnabled: true } }),
      prisma.organization.count({ where: { deletedAt: null } }),
    ]);
    return { enabled, total };
  } catch {
    return { enabled: 0, total: 0 };
  }
}

/* ───────────────────────── 감사 문자 문구 ─────────────────────────
 *
 * 국내 SMS(EMMA service_type='0')는 EUC-KR 기준 **90바이트** 제한이다.
 * (emma.cf 의 gw.charset = EUC-KR)
 *
 * 기존 문구는 기관명을 제외한 고정부만 81바이트여서 기관명에 한글 4자밖에
 * 쓸 수 없었다. 실제 기관명 표본 10개 중 8개가 한도를 넘겨, 그대로 발송하면
 * 대부분 잘리거나 거부된다. → 문구를 줄이고, 그래도 넘치면 기관명을 안전하게 자른다.
 */

/** 국내 SMS 최대 바이트 (EUC-KR) */
export const SMS_MAX_BYTES = 90;

/** EUC-KR 기준 바이트 길이. ASCII 1바이트, 그 외(한글 등) 2바이트. */
export function euckrBytes(s: string): number {
  let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) < 128 ? 1 : 2;
  return n;
}

/** 2바이트 문자를 쪼개지 않고 바이트 한도까지 자른다. */
export function truncateByBytes(s: string, limit: number): string {
  let out = "";
  let n = 0;
  for (const ch of s) {
    const w = ch.charCodeAt(0) < 128 ? 1 : 2;
    if (n + w > limit) break;
    out += ch;
    n += w;
  }
  return out;
}

/**
 * 감사 문자 본문을 만든다. 결과는 항상 90바이트 이하다.
 * 기관명이 길면 기관명만 잘리고 안내 문구는 보존된다.
 */
export function buildThankYouMessage(orgName: string, amount: number): string {
  // 기관명을 맨 앞 대괄호에 둔다 — 문자 앱에서 대괄호 첫머리가 발신 주체로 읽히므로
  // 후원자가 "내가 후원한 그 기관이 보낸 문자"로 인식한다.
  const prefix = "[";
  const suffix = `] ${amount.toLocaleString("ko-KR")}원 후원 감사합니다.`;
  const room = SMS_MAX_BYTES - euckrBytes(prefix) - euckrBytes(suffix);

  // 기관명을 넣을 자리가 없을 만큼 금액이 크면 기관명을 생략한다.
  if (room < 6) return `[나눔플러스]${suffix}`.replace("][", "] [");

  const name =
    euckrBytes(orgName) <= room
      ? orgName
      : truncateByBytes(orgName, room - 2).trimEnd() + "..";

  return prefix + name + suffix;
}

/* ───────────────────────── 발신번호 형식 검증 ─────────────────────────
 *
 * 실제 발송 가능 여부는 인포뱅크 **발신번호 사전등록** 여부가 결정한다.
 * 여기서는 오타로 인한 발송 실패만 걸러내는 최소 검사를 한다.
 */

export type SenderNumberCheck = { ok: true; normalized: string } | { ok: false; reason: string };

/** 하이픈·공백을 제거하고 국내 전화번호 형태인지 확인한다. */
export function validateSenderNumber(raw: string): SenderNumberCheck {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 0) return { ok: false, reason: "발신번호를 입력해 주세요." };

  // 전국대표번호 (1588 / 1544 / 1644 / 1661 / 1877 ...) — 8자리
  if (/^1[5-9]\d{6}$/.test(digits)) return { ok: true, normalized: digits };

  // 일반 유선·이동·인터넷전화 — 0으로 시작하는 9~12자리
  if (digits.startsWith("0")) {
    if (digits.length < 9 || digits.length > 12) {
      return { ok: false, reason: "번호 자릿수가 올바르지 않습니다. (9~12자리)" };
    }
    return { ok: true, normalized: digits };
  }

  return {
    ok: false,
    reason: "0으로 시작하는 번호 또는 1588 형태의 대표번호를 입력해 주세요.",
  };
}
