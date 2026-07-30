/** 공급사(provider) 연동 공통 타입 */

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };

export interface SmsDonationInitRequest {
  organizationId: string;
  smsFullNumber: string; // 예: #25401234
  amount: number;
  phone?: string;
  campaignId?: string;
}

export interface SmsDonationInitResult {
  providerTransactionId: string;
  smsNumber: string;
  guideMessage: string;
}

// ---------------------------------------------------------------------------
// MT (Mobile Terminated) — 우리가 후원자에게 보내는 감사 문자
// ---------------------------------------------------------------------------

export interface SmsMtRequest {
  /** 후원자 발신 번호 (MO senderPhone 그대로) */
  recipientPhone: string;
  /** 발신 번호 — 환경변수 INFOBANK_MT_SENDER_NUMBER 에서 주입 */
  senderNumber: string;
  /** 감사 문자 내용 */
  message: string;
  /** 추적용 (옵션) */
  providerTransactionId?: string;
}

export interface SmsMtResult {
  messageId: string;
  status: "SENT" | "QUEUED";
}

/** 인포뱅크 문자후원 어댑터 인터페이스 — 실제 API 문서 확보 시 live 구현체로 교체 */
export interface InfobankSmsDonationAdapter {
  readonly providerName: "infobank";
  initDonation(req: SmsDonationInitRequest): Promise<ProviderResult<SmsDonationInitResult>>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  /**
   * MT 발송 — MO 수신 후 후원자에게 감사 문자를 발송한다.
   * - Mock 모드: 콘솔 로그만 남기고 성공 반환
   * - Live 모드: 실제 인포뱅크 MT API 호출 (API 문서 확보 후 구현)
   */
  sendMt(req: SmsMtRequest): Promise<ProviderResult<SmsMtResult>>;
}

export interface TransferInitRequest {
  organizationId: string;
  amount: number;
  donorName: string;
  donorPhone?: string;
  donorEmail?: string;
  campaignId?: string;
}

export interface TransferInitResult {
  providerTransactionId: string;
  redirectUrl?: string; // 실제 연동 시 온기 결제창 URL
  status: "PENDING" | "COMPLETED";
}

export interface RecurringInitRequest extends TransferInitRequest {
  dayOfMonth: number; // 매월 출금일
}

export interface RecurringInitResult {
  providerContractId: string;
  status: "ACTIVE" | "PENDING";
}

/** 온기 간편 계좌이체 / 정기 계좌후원 어댑터 인터페이스 */
export interface OnkiTransferAdapter {
  readonly providerName: "onki";
  initEasyTransfer(req: TransferInitRequest): Promise<ProviderResult<TransferInitResult>>;
  registerRecurring(req: RecurringInitRequest): Promise<ProviderResult<RecurringInitResult>>;
  cancelTransaction(providerTransactionId: string): Promise<ProviderResult<{ cancelled: boolean }>>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}
