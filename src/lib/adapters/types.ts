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
  /** 발송 게이트 판정용 기관 ID — 미지정 시 안전을 위해 발송이 차단된다 */
  organizationId?: string;
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

// ---------------------------------------------------------------------------
// 핵토(Hecto) 간편 계좌이체 — "내통장결제"
//  · 간편 계좌이체(일시) + 계좌 자동이체(정기)를 담당.
//  · TransferInit* / RecurringInit* 타입을 그대로 재사용한다.
// ---------------------------------------------------------------------------
export interface HectoTransferAdapter {
  readonly providerName: "hecto";
  initEasyTransfer(req: TransferInitRequest): Promise<ProviderResult<TransferInitResult>>;
  registerRecurring(req: RecurringInitRequest): Promise<ProviderResult<RecurringInitResult>>;
  cancelTransaction(providerTransactionId: string): Promise<ProviderResult<{ cancelled: boolean }>>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}

// ---------------------------------------------------------------------------
// 핵토(Hecto) 신용카드 정기후원 — 빌링키(자동결제 키) 방식
//  · 발급: 후원자가 카드 정보를 (실연동 시) 핵토 결제창에서 입력 → 빌링키 토큰 수령.
//  · 청구: 저장한 빌링키로 매월 자동 청구.
//  · 서버는 카드 원문(PAN/CVC)을 절대 저장하지 않는다. billingKeyRef(토큰)만 보관.
// ---------------------------------------------------------------------------
export interface BillingKeyIssueRequest {
  organizationId: string;
  donorName: string;
  donorPhone?: string;
  donorEmail?: string;
  /** 표시용 메타(실연동 시 핵토가 반환). Mock 테스트 입력값. */
  cardIssuer?: string;
  cardLast4?: string;
}

export interface BillingKeyIssueResult {
  billingKeyRef: string; // 저장할 빌링키 토큰/참조값
  cardIssuer?: string;
  cardLast4?: string;
  redirectUrl?: string;  // 실연동 시 핵토 카드등록창 URL (Mock은 미사용)
}

export interface BillingChargeRequest {
  billingKeyRef: string;
  amount: number;
  organizationId: string;
  orderName?: string;
}

export interface BillingChargeResult {
  providerTransactionId: string;
  status: "COMPLETED" | "FAILED" | "PENDING";
}

export interface HectoBillingAdapter {
  readonly providerName: "hecto";
  /** 빌링키 발급 (카드 등록). */
  issueBillingKey(req: BillingKeyIssueRequest): Promise<ProviderResult<BillingKeyIssueResult>>;
  /** 빌링키로 1회 청구 (정기후원 회차 결제). */
  chargeBillingKey(req: BillingChargeRequest): Promise<ProviderResult<BillingChargeResult>>;
  /** 빌링키 삭제 (정기후원 해지). */
  deleteBillingKey(billingKeyRef: string): Promise<ProviderResult<{ deleted: boolean }>>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}
