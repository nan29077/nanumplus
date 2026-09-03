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
import { findOrCreateDonor, ANON_SMS_DONOR_NAME } from "@/lib/donor";
import { resolveMtGate, buildThankYouMessage } from "@/lib/messaging";
import { getEmmaClient, getEmmaSuffix, getPrevEmmaSuffix } from "./client";
import { sendEmmaMt } from "./mt-sender";
import {
  type EmmaMoRecord,
  type EmmaMoProcessResult,
  EMMA_MSG_STATUS,
} from "./types";

/** 미처리 MO 레코드를 조회 (이번 달 + 저번 달 테이블)
 *
 * 조회 대상:
 *  - msg_status = '3' : 우리 시스템 기준 신규
 *  - msg_status = '0' : Infobank EMMA 버전에 따라 신규를 '0'으로 표기하는 경우 대비
 *  - msg_status = '2' 이면서 5분 이상 갱신되지 않은 건 :
 *      '처리중' 상태로 선점된 뒤 프로세스가 중단되어 영구 고착된 건의 복구
 *  중복 처리는 providerTransactionId unique 제약으로 방지한다.
 */
const MO_STALE_INTERVAL = "5 minutes";

/**
 * updated_at 컬럼 보유 여부 캐시 (테이블별).
 * EMMA 기본 스키마에는 updated_at이 없으므로, 우리 쪽에서 컬럼을 추가해
 * 상태 변경 시각을 기록하고 고착 건 복구에 사용한다.
 * ALTER 권한이 없는 환경에서도 동작하도록 실패 시 false로 캐시한다.
 */
const hasUpdatedAt = new Map<string, boolean>();

async function ensureUpdatedAtColumn(suffix: string): Promise<boolean> {
  const cached = hasUpdatedAt.get(suffix);
  if (cached !== undefined) return cached;

  const client = getEmmaClient();
  const table = `em_mo_log_${suffix}`;
  try {
    await client.$executeRawUnsafe(
      `ALTER TABLE ${table}
         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now()`
    );
    hasUpdatedAt.set(suffix, true);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[emma-mo] ${table} updated_at 컬럼 확보 실패 → 고착 복구 비활성:`, msg);
    hasUpdatedAt.set(suffix, false);
    return false;
  }
}

/** updated_at 컬럼이 있을 때만 SET 절에 갱신 시각을 추가 */
function touchClause(suffix: string): string {
  return hasUpdatedAt.get(suffix) ? ", updated_at = NOW()" : "";
}

async function fetchUnprocessedMo(suffix: string): Promise<EmmaMoRecord[]> {
  const client = getEmmaClient();
  const table = `em_mo_log_${suffix}`;

  // 고착 건 복구 조건은 updated_at 컬럼이 있을 때만 적용
  const staleClause = (await ensureUpdatedAtColumn(suffix))
    ? `OR (msg_status = '${EMMA_MSG_STATUS.PROCESSING}'
             AND updated_at < NOW() - INTERVAL '${MO_STALE_INTERVAL}')`
    : "";

  try {
    // 테이블이 존재하지 않으면 빈 배열 반환 (EMMA 미설치 환경)
    const rows = await client.$queryRawUnsafe<EmmaMoRecord[]>(
      `SELECT mo_key, service_type, mo_recipient, emo_recipient,
              mo_originator, mo_callback, msg_status, subject, content,
              date_mo, date_mo_recv, carrier, rs_id, ems_id, ems_total,
              ems_seq, emma_id
       FROM ${table}
       WHERE msg_status IN ('3', '0')
          ${staleClause}
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
    `UPDATE ${table} SET msg_status = $1${touchClause(suffix)} WHERE mo_key = $2`,
    status,
    moKey
  );
}

/**
 * 상태를 '신규'에서 '처리중'으로 원자적으로 선점한다.
 * WHERE 조건에 이전 상태를 포함하므로 다른 프로세스가 먼저 변경했을 경우
 * 0건이 업데이트되어 false를 반환한다.
 *
 * 신규('3','0')뿐 아니라 5분 이상 '처리중'('2')으로 남은 고착 건도 선점 대상에 포함해,
 * 처리 도중 프로세스가 중단된 MO가 영구히 묻히지 않도록 한다.
 */
async function claimMoForProcessing(suffix: string, moKey: string): Promise<boolean> {
  const client = getEmmaClient();
  const table = `em_mo_log_${suffix}`;
  const staleClause = hasUpdatedAt.get(suffix)
    ? `OR (msg_status = '${EMMA_MSG_STATUS.PROCESSING}'
             AND updated_at < NOW() - INTERVAL '${MO_STALE_INTERVAL}')`
    : "";
  const result = await client.$queryRawUnsafe<[{ count: bigint }]>(
    `WITH updated AS (
       UPDATE ${table}
       SET msg_status = $1${touchClause(suffix)}
       WHERE mo_key = $2
         AND (msg_status IN ('3', '0') ${staleClause})
       RETURNING 1
     )
     SELECT COUNT(*) AS count FROM updated`,
    EMMA_MSG_STATUS.PROCESSING,
    moKey
  );
  return Number(result[0].count) > 0;
}

/**
 * mo_originator 번호로 Donor를 찾거나 생성.
 *
 * 전화번호 정규화(+82 · 82 국가번호 → 0)는 공통 헬퍼(normalizePhone)가 담당한다.
 * 기존 구현은 `replace(/^82/, "0")`을 숫자 정리보다 먼저 실행해
 * "+821012345678" 처럼 기호가 앞에 붙은 국제 형식을 처리하지 못했다.
 */
async function findOrCreateMoDonor(
  organizationId: string,
  phone: string
): Promise<string> {
  return findOrCreateDonor(prisma, {
    organizationId,
    name: ANON_SMS_DONOR_NAME,
    phone,
    privacyConsent: false,
    storeNormalizedPhone: true,
  });
}

/**
 * MT 감사 문자 발송.
 *
 * 큐에 넣기 전에 발송 게이트(전역 마스터 AND 기관 스위치)를 확인한다.
 * em_smt_tran 에 들어간 뒤에는 EMMA가 집어가므로 되돌릴 수 없다 —
 * 차단은 반드시 이 지점에서 이루어져야 한다.
 */
async function sendThankYouMt(
  org: { id: string; name: string },
  recipientPhone: string,
  moKey: string
): Promise<void> {
  const gate = await resolveMtGate(org.id);
  if (!gate.allowed) {
    console.log(`[emma-mo] 감사문자 미발송 (org=${org.name}): ${gate.reason}`);
    return;
  }

  // SMS 90바이트(EUC-KR) 한도를 넘지 않도록 조립한다 — 기존 문구는 대부분의 기관에서 초과했다.
  const message = buildThankYouMessage(org.name, SMS_DONATION_AMOUNT);

  const result = await sendEmmaMt({
    recipientPhone,
    senderPhone: gate.senderNumber,
    content: message,
    moKey,
    organizationId: org.id,
  });

  if (result.status === "ERROR") {
    console.error(`[emma-mo] MT 발송 실패 (moKey=${moKey}):`, result.message);
  } else if (result.status === "BLOCKED") {
    console.log(`[emma-mo] MT 차단 (moKey=${moKey}): ${result.message}`);
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

  /**
   * EMMA 3.7은 수신번호를 mo_recipient(#2540 대표번호)와
   * emo_recipient(뒷자리, 예: "4679")로 분리해 저장한다.
   * 두 값을 합쳐 전체 번호(#2540-4679)를 복원한다.
   * emo_recipient가 '#'으로 시작하면 전체 번호가 담긴 것으로 보고 그대로 사용.
   */
  const fullRecipient = (moRecipient: string, emoRecipient: string | null) => {
    const emo = (emoRecipient ?? "").trim();
    if (emo.startsWith("#")) return normalizeRecipient(emo);
    return normalizeRecipient(`${moRecipient}${emo}`);
  };

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

      // 처리 중으로 상태를 원자적으로 선점 (다른 프로세스가 먼저 변경했으면 0건 → 건너뜀)
      let claimed = false;
      try {
        claimed = await claimMoForProcessing(suffix, mo_key);
      } catch {
        result.skipped++;
        result.details.push({ moKey: mo_key, status: "skipped", reason: "상태 선점 실패 (DB 오류)" });
        continue;
      }
      if (!claimed) {
        result.skipped++;
        result.details.push({ moKey: mo_key, status: "skipped", reason: "이미 처리 중인 MO (중복 실행)" });
        continue;
      }

      // 기관 매핑 (mo_recipient + emo_recipient 결합 → 대시 정규화 후 조회)
      const normalizedRecipient = fullRecipient(mo_recipient, row.emo_recipient);
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
        console.warn(`[emma-mo] 기관 미매핑: recipient=${normalizedRecipient} (mo=${mo_recipient}, emo=${row.emo_recipient ?? ""}) → 기관배정 없음으로 저장`);
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
        const donorId = await findOrCreateMoDonor(org.id, mo_originator);

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

        // MT 감사 문자 발송 (게이트 통과 시에만 실제 발송)
        await sendThankYouMt(org, mo_originator, mo_key);

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
