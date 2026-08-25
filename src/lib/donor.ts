/**
 * 후원자(Donor) 조회·생성 공통 헬퍼.
 *
 * H-1: 후원 신청 API(간편이체·정기이체·카드정기)가 매번 Donor를 새로 생성해
 * 같은 사람이 후원할 때마다 중복 레코드가 쌓이던 문제를 해결한다.
 * EMMA MO 처리기(mo-processor)와 동일하게 "전화번호(우선) → 이메일" 순으로
 * 기존 후원자를 찾고, 없을 때만 생성한다.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** EMMA MO 처리기가 문자후원자에게 붙이는 임시 이름 */
export const ANON_SMS_DONOR_NAME = "문자후원자";

/**
 * 전화번호를 숫자만 남긴 국내 형식으로 정규화한다.
 *  - "010-1234-5678"   → "01012345678"
 *  - "+82 10-1234-5678" → "01012345678"
 *  - "821012345678"     → "01012345678"
 *
 * 기존 구현은 `replace(/^82/, "0")`을 먼저 수행해 "+82…" 처럼 앞에 기호가 붙은
 * 국제 형식을 처리하지 못했다. 숫자만 남긴 뒤에 국가번호를 치환한다.
 */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  // 국가번호 82 + 국내번호(선행 0 제거) = 최소 11자리
  if (digits.startsWith("82") && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

export type FindOrCreateDonorInput = {
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  privacyConsent?: boolean;
  isRecurring?: boolean;
  donorAccountId?: string | null;
  /** true면 전화번호를 정규화된 숫자 형태로 저장한다 (EMMA MO 경로) */
  storeNormalizedPhone?: boolean;
};

/**
 * 기관 내에서 동일 후원자를 찾고, 없으면 생성해 Donor.id 를 반환한다.
 *
 * 매칭 우선순위
 *  1) 전화번호 — 입력값 원문과 정규화값을 모두 후보로 조회 (표기 차이 흡수)
 *  2) 이메일   — 전화번호가 없을 때만
 * 전화·이메일이 모두 없으면 식별할 방법이 없으므로 항상 새로 생성한다.
 *
 * 기존 후원자를 찾은 경우 값을 덮어쓰지 않고 "비어 있는 항목만 보강"한다.
 * (이미 등록된 실명이 "문자후원자" 같은 임시 이름으로 밀리지 않도록)
 */
export async function findOrCreateDonor(db: DbClient, input: FindOrCreateDonorInput): Promise<string> {
  const rawPhone = (input.phone ?? "").trim();
  const normalized = normalizePhone(rawPhone);
  const email = (input.email ?? "").trim() || null;
  const phoneToStore = input.storeNormalizedPhone ? normalized || null : rawPhone || null;

  const phoneCandidates = Array.from(new Set([rawPhone, normalized].filter(Boolean)));

  const existing = phoneCandidates.length
    ? await db.donor.findFirst({
        where: { organizationId: input.organizationId, deletedAt: null, phone: { in: phoneCandidates } },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, isRecurring: true, donorAccountId: true, privacyConsent: true },
      })
    : email
      ? await db.donor.findFirst({
          where: { organizationId: input.organizationId, deletedAt: null, email },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, isRecurring: true, donorAccountId: true, privacyConsent: true },
        })
      : null;

  if (existing) {
    const patch: Prisma.DonorUpdateInput = {};
    // 임시 이름(문자후원자)만 실명으로 교체 — 기존 실명은 유지
    if (input.name && existing.name === ANON_SMS_DONOR_NAME && input.name !== ANON_SMS_DONOR_NAME) {
      patch.name = input.name;
    }
    if (email && !existing.email) patch.email = email;
    if (input.isRecurring && !existing.isRecurring) patch.isRecurring = true;
    if (input.privacyConsent && !existing.privacyConsent) patch.privacyConsent = true;
    if (input.donorAccountId && !existing.donorAccountId) {
      patch.donorAccount = { connect: { id: input.donorAccountId } };
    }
    if (Object.keys(patch).length > 0) {
      await db.donor.update({ where: { id: existing.id }, data: patch });
    }
    return existing.id;
  }

  const created = await db.donor.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      phone: phoneToStore,
      email,
      privacyConsent: input.privacyConsent ?? false,
      isRecurring: input.isRecurring ?? false,
      donorAccountId: input.donorAccountId ?? null,
    },
    select: { id: true },
  });
  return created.id;
}
