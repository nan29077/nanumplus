/**
 * EMMA MO 처리기
 *
 * em_mo_log_YYYYMM 테이블을 폴링하여 미처리 MO 레코드를
 * 나눔플러스 Donation으로 변환한다.
 *
 * 처리 흐름:
 *  1. 이번 달(+ 저번 달) MO 테이블에서 msg_status IN ('3','0') 레코드 조회
 *     → 우리 시스템: '3'=신규 / Infobank EMMA 버전에 따라 '0'=신규인 경우도 있음
 *  2. mo_recipient(#25401234) → Organization 매핑
 *  3. Donation 생성 (providerTransactionId=mo_key 로 중복 방지)
 *  4. Donor 조회 또는 생성 (mo_originator 전화번호 기반)
 *  5. msg_status='9' (나눔플러스 처리완료) 또는 '1' (오류) 업데이트
 *  6. MT 감사 문자 발송
 */

import { prisma } from "@/lib/prisma";
import { SMS_DONATION_AMOUNT } from "@/lib/validation";
import { getEmmaClient, getEmmaSuffix, getPrevEmmaSuffix } from "./client";
import { sendEmmaMt } from "./mt-sender";
import {
  type EmmaMoRecord,
  type EmmaMoProcessResult,
  EMMA_MSG_STATUS,
} from "./types";

/** 미처리 MO 레코드를 조회 (이번 달 + 저번 달 테이블)
 *
 * msg_status IN ('3', '0') 를 조회한다:
 *  - '3' = 우리 시스템 기준 신규
 *  - '0' = Infobank EMMA 버전에 따라 신규를 '0'으로 표기하는 경우 대비
 *  중복 처리는 providerTransactionId unique 제약으로 방지한다.
 */
async function fetchUnprocessedMo(suffix: string): Promise<EmmaMoRecord[]> {
  const client = getEmmaClient();
  const table = `em_mo_log_${suffix}`;

  try {
    // 테이블이 존재하지 않으면 빈 배열 반환 (EMMA 미설치 환경)
    const rows = await client.$queryRawUnsafe<EmmaMoRecord[]>(
      `SELECT mo_key, service_type, mo_recipient, emo_recipient,
              mo_originator, mo_callback, msg_status, subject, content,
              date_mo, date_mo_recv, carrier, rs_id, ems_id, ems_total,
              ems_seq, emma_id
       FROM ${table}
       WHERE msg_status IN ('3', '0')
       ORDER BY date_mo ASC
       LIMIT 100`
    );
    return rows;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 테이블이 없는 경우(EMMA 미설치)는 조용히 무시
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return [];
    }
    throw err;
  }
}

/** MO 레코드의 msg_status를 업데이트 */
async function updateMoStatus(
  suffix: string,
  moKey: string,
  status: string
): Promise<void> {
  const client = getEmmaClient();
  const table = `em_mo_log_${suffix}`;
  await client.$queryRawUnsafe(
    `UPDATE ${table} SET msg_status = $1 WHERE mo_key = $2`,
    status,
    moKey
  );
}

/** mo_originator 번호로 Donor를 찾거나 생성 */
async function findOrCreateDonor(
  organizationId: string,
  phone: string
): Promise<string> {
  // 전화번호 정규화: 국제형식 제거 (821012345678 → 01012345678)
  const normalizedPhone = phone
    .replace(/^82/, "0")  // 821012345678 → 01012345678
    .replace(/[^0-9]/g, "");

  const existing = await prisma.donor.findFirst({
    where: { organizationId, phone: normalizedPhone, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.donor.create({
    data: {
      organizationId,
      name: "문자후원자",
      phone: normalizedPhone,
      privacyConsent: false,
    },
    select: { id: true },
  });
  return created.id;
}

/** MT 감사 문자 발송 */
async function sendThankYouMt(
  orgName: string,
  recipientPhone: string,
  moKey: string
): Promise<void> {
  const senderNumber = process.env.INFOBANK_MT_SENDER_NUMBER ?? "";
  if (!senderNumber) {
    console.log("[emma-mo] MT 발신 번호 미설정 → MT 발송 생략");
    return;
  }

  const message = `[나눔플러스] ${orgName}에 ${SMS_DONATION_AMOUNT.toLocaleString("ko-KR")}원을 후원해 주셔서 감사합니다. 따뜻한 마음이 큰 힘이 됩니다.`;

  const result = await sendEmmaMt({
    recipientPhone,
    senderPhone: senderNumber,
    content: message,
    moKey,
  });

  if (result.status === "ERROR") {
    console.error(`[emma-mo] MT 발송 실패 (moKey=${moKey}):`, result.message);
  }
}

/** 메인 처리 함수 — cron 엔드포인트에서 호출 */
export async function processEmmaMo(): Promise<EmmaMoProcessResult> {
  const result: EmmaMoProcessResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const now = new Date();
  const suffixes = Array.from(
    new Set([getEmmaSuffix(now), getPrevEmmaSuffix(now)])
  );

  // 기관 SMS 번호 맵 로드 (smsFullNumber → Organization)
  const orgs = await prisma.organization.findMany({
    where: { smsFullNumber: { not: null }, isActive: true, deletedAt: null },
    select: { id: true, name: true, smsFullNumber: true },
  });
  const orgByNumber = new Map(orgs.map((o) => [o.smsFullNumber!, o]));

  /**
   * EMMA mo_recipient는 대시 없이 전달됨 (예: #25401234).
   * DB smsFullNumber는 대시 포함 (예: #2540-1234).
   * → 조회 전에 #2540 다음에 대시가 없으면 삽입하여 정규화.
   */
  const normalizeRecipient = (r: string) => r.replace(/^(#2540)(?!-)/, "$1-");

  for (const suffix of suffixes) {
    let records: EmmaMoRecord[];
    try {
      records = await fetchUnprocessedMo(suffix);
    } catch (err) {
      console.error(`[emma-mo] ${suffix} 테이블 조회 오류:`, err);
      continue;
    }

    for (const row of records) {
      const { mo_key, mo_recipient, mo_originator, content, date_mo } = row;

      // 처리 중으로 상태 변경 (중복 실행 방지)
      try {
        await updateMoStatus(suffix, mo_key, EMMA_MSG_STATUS.PROCESSING);
      } catch {
        // 이미 다른 프로세스가 변경했을 가능성 — 건너뜀
        result.skipped++;
        result.details.push({ moKey: mo_key, status: "skipped", reason: "상태 변경 실패 (중복 실행)" });
        continue;
      }

      // 기관 매핑 (mo_recipient 대시 정규화 후 조회)
      const normalizedRecipient = normalizeRecipient(mo_recipient);
      const org = orgByNumber.get(normalizedRecipient);

      // 이미 처리된 mo_key 중복 방지 (Donation.providerTransactionId unique)
      const existing = await prisma.donation.findUnique({
        where: { providerTransactionId: mo_key },
        select: { id: true },
      });
      if (existing) {
        await updateMoStatus(suffix, mo_key, "9"); // 이미 처리됨 → '9' 마크
        result.skipped++;
        result.details.push({ moKey: mo_key, status: "duplicate", reason: "이미 처리된 MO" });
        continue;
      }

      if (!org) {
        // 기관 미배정 번호 — Donation은 생성하되 organizationId=null (최고관리자에 표시)
        // ※ Prisma 클라이언트가 아직 organizationId=nullable을 모르므로 raw SQL 사용
        console.warn(`[emma-mo] 기관 미매핑: mo_recipient=${mo_recipient} → 기관배정 없음으로 저장`);
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Donation"
               (id, "organizationId", "donorId", channel, amount, status,
                "providerName", "providerTransactionId", "smsBody", "senderPhone",
                "recipientNumber", "donatedAt", "createdAt", "updatedAt")
             VALUES
               (gen_random_uuid()::text, NULL, NULL, 'SMS'::"DonationChannel", $1,
                'COMPLETED'::"DonationStatus", 'infobank-emma', $2, $3, $4, $5, $6, NOW(), NOW())`,
            SMS_DONATION_AMOUNT,
            mo_key,
            content ?? null,
            mo_originator,
            normalizedRecipient,
            date_mo ? new Date(date_mo) : new Date(),
          );
          await updateMoStatus(suffix, mo_key, "9"); // '9' = 나눔플러스 처리완료 (EMMA '0'과 충돌 방지)
          result.processed++;
          result.details.push({ moKey: mo_key, status: "created", reason: `기관배정 없음 (${mo_recipient})` });
          console.log(`[emma-mo] 기관배정 없음 저장: ${mo_key} phone=${mo_originator} recipient=${mo_recipient}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[emma-mo] 기관배정 없음 Donation 생성 오류 (moKey=${mo_key}):`, msg);
          await updateMoStatus(suffix, mo_key, EMMA_MSG_STATUS.ERROR).catch(() => {});
          result.errors++;
          result.details.push({ moKey: mo_key, status: "error", reason: msg });
        }
        continue;
      }

      try {
        // Donor 조회/생성
        const donorId = await findOrCreateDonor(org.id, mo_originator);

        // Donation 생성
        const created = await prisma.donation.create({
          data: {
            organizationId: org.id,
            donorId,
            channel: "SMS",
            amount: SMS_DONATION_AMOUNT,
            status: "COMPLETED",
            providerName: "infobank-emma",
            providerTransactionId: mo_key,
            smsBody: content ?? null,
            senderPhone: mo_originator,
            donatedAt: date_mo ? new Date(date_mo) : new Date(),
          },
        });
        // recipientNumber 저장 (스키마 재생성 전까지 raw SQL 사용)
        await prisma.$executeRawUnsafe(
          `UPDATE "Donation" SET "recipientNumber" = $1 WHERE id = $2`,
          normalizedRecipient,
          created.id
        );

        // EMMA MO 완료 처리 ('9' = 나눔플러스 처리완료, EMMA '0'=신규와 충돌 방지)
        await updateMoStatus(suffix, mo_key, "9");

        // MT 감사 문자 발송
        await sendThankYouMt(org.name, mo_originator, mo_key);

        result.processed++;
        result.details.push({ moKey: mo_key, status: "created" });

        console.log(`[emma-mo] 처리 완료: ${mo_key} → org=${org.name} phone=${mo_originator}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[emma-mo] Donation 생성 오류 (moKey=${mo_key}):`, msg);
        await updateMoStatus(suffix, mo_key, EMMA_MSG_STATUS.ERROR).catch(() => {});
        result.errors++;
        result.details.push({ moKey: mo_key, status: "error", reason: msg });
      }
    }
  }

  return result;
}
