/**
 * EMMA MT (Mobile Terminated) sender module
 *
 * EMMA 에이전트가 실제로 폴링·발송하는 큐 테이블은 em_smt_tran이다.
 * (em_mt_log_YYYYMM은 EMMA가 읽지 않는 자체 로그 테이블이었음 — 발송 안 됨)
 *
 * em_smt_tran 주요 컬럼 (인포뱅크 EMMA 3.7 표준):
 *   mt_pr           NUMERIC(11) PK  -- sq_em_smt_tran_01 시퀀스
 *   date_client_req TIMESTAMP       -- 클라이언트 요청 시각
 *   content         VARCHAR(4000)   -- 문자 내용
 *   callback        VARCHAR(25)     -- 발신번호 (회신번호)
 *   service_type    CHAR(2)         -- '0' = SMS
 *   broadcast_yn    CHAR(1)         -- 'N'
 *   msg_status      CHAR(1)         -- '1' = 발송 대기 (EMMA가 픽업)
 *   recipient_num   VARCHAR(25)     -- 수신자 번호
 *   emma_id         CHAR(2)
 *
 * 발송 결과는 EMMA가 msg_status/mt_report_code_ib를 갱신하고
 * 월별 em_smt_log_YYYYMM으로 이관한다.
 */

import { getEmmaClient } from "./client";
import type { EmmaMtSendRequest, EmmaMtSendResult } from "./types";

/** EMMA 발송 큐(em_smt_tran)에 MT 등록 — EMMA 에이전트가 픽업해 발송 */
export async function sendEmmaMt(
  req: EmmaMtSendRequest
): Promise<EmmaMtSendResult> {
  // EMMA_ID = "nanum" -> CHAR(2) 필드에는 앞 2자리 "na"만 기록
  const emmaIdFull = process.env.EMMA_ID ?? "  ";
  const emmaId = emmaIdFull.substring(0, 2).padEnd(2, " ");

  const client = getEmmaClient();

  try {
    const rows = await client.$queryRawUnsafe<[{ mt_pr: unknown }]>(
      `INSERT INTO em_smt_tran (
        mt_pr, date_client_req, content, callback,
        service_type, broadcast_yn, msg_status, recipient_num, emma_id
      ) VALUES (
        nextval('sq_em_smt_tran_01'), NOW(), $1, $2, '0', 'N', '1', $3, $4
      ) RETURNING mt_pr`,
      req.content,
      req.senderPhone,
      req.recipientPhone,
      emmaId
    );

    const mtKey = `SMT-${String(rows[0]?.mt_pr ?? "")}`;
    return { mtKey, status: "QUEUED" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[emma-mt] MT queue insert failed:", message);
    return { mtKey: "", status: "ERROR", message };
  }
}
