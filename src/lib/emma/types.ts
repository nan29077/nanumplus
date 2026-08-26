/**
 * EMMA (Enterprise Mobile Mail Agent) — 인포뱅크 온프레미스 SMS 에이전트 타입 정의
 *
 * EMMA는 DB 테이블 기반으로 동작한다:
 *  - MO(수신): em_mo_log_YYYYMM 테이블에 EMMA가 기록 → 나눔플러스가 폴링
 *  - MT(발신): em_smt_tran 테이블에 나눔플러스가 INSERT → EMMA가 픽업해 발송
 */

/** EMMA MO 로그 레코드 (em_mo_log_YYYYMM) */
export interface EmmaMoRecord {
  mo_key: string;         // PK — 고유 키
  service_type: string;   // 서비스 유형
  mo_recipient: string;   // 수신 번호 (기관 SMS 번호, 예: #25401234)
  emo_recipient: string | null;
  mo_originator: string;  // 발신 번호 (후원자 전화번호)
  mo_callback: string;    // 콜백 번호
  msg_status: string;     // '3'=미처리, '2'=처리중, '0'=완료, '1'=오류
  subject: string | null;
  content: string | null; // SMS 본문
  date_mo: Date;          // MO 수신 시각
  date_mo_recv: Date;
  carrier: number | null;
  rs_id: string | null;
  ems_id: number | null;
  ems_total: number | null;
  ems_seq: number | null;
  emma_id: string;        // EMMA 인스턴스 ID (2자리)
}

/** MT 발신 요청 */
export interface EmmaMtSendRequest {
  /** 수신자 전화번호 (후원자) */
  recipientPhone: string;
  /** 발신 번호 (등록된 발신 번호) */
  senderPhone: string;
  /** 메시지 본문 */
  content: string;
  /** 연결 MO 키 (옵션) */
  moKey?: string;
}

/** MT 발신 결과 */
export interface EmmaMtSendResult {
  mtKey: string;
  status: "QUEUED" | "ERROR";
  message?: string;
}

/** EMMA MO 처리 결과 */
export interface EmmaMoProcessResult {
  processed: number;  // 처리된 MO 건수
  skipped: number;    // 기관 미매칭 등으로 건너뜀
  errors: number;     // 오류 건수
  details: {
    moKey: string;
    status: "created" | "skipped" | "error" | "duplicate";
    reason?: string;
  }[];
}

/** msg_status 상수 */
export const EMMA_MSG_STATUS = {
  NEW: "3",        // 미처리 (수신 완료)
  PROCESSING: "2", // 처리 중
  DONE: "0",       // 처리 완료
  ERROR: "1",      // 오류
} as const;
