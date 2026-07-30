import crypto from "crypto";
import type {
  OnkiTransferAdapter, ProviderResult,
  TransferInitRequest, TransferInitResult,
  RecurringInitRequest, RecurringInitResult,
} from "./types";

/**
 * 온기 간편 계좌이체 / 정기 계좌후원 Mock 구현체.
 * 실제 연동 시 ONKI_PROVIDER=live 와 .env의 API 키/엔드포인트로 교체한다.
 */
export class OnkiMockAdapter implements OnkiTransferAdapter {
  readonly providerName = "onki" as const;

  async initEasyTransfer(
    req: TransferInitRequest
  ): Promise<ProviderResult<TransferInitResult>> {
    if (req.amount < 1000) {
      return { ok: false, errorCode: "MIN_AMOUNT", message: "최소 후원 금액은 1,000원입니다." };
    }
    // Mock: 즉시 완료 처리. 실제 연동에서는 PENDING + redirectUrl 반환 후 웹훅으로 완료.
    return {
      ok: true,
      data: {
        providerTransactionId: `ONKI-TR-MOCK-${crypto.randomUUID()}`,
        status: "COMPLETED",
      },
    };
  }

  async registerRecurring(
    req: RecurringInitRequest
  ): Promise<ProviderResult<RecurringInitResult>> {
    if (req.amount < 1000) {
      return { ok: false, errorCode: "MIN_AMOUNT", message: "최소 정기후원 금액은 1,000원입니다." };
    }
    if (req.dayOfMonth < 1 || req.dayOfMonth > 28) {
      return { ok: false, errorCode: "INVALID_DAY", message: "출금일은 1~28일 사이여야 합니다." };
    }
    return {
      ok: true,
      data: {
        providerContractId: `ONKI-RC-MOCK-${crypto.randomUUID()}`,
        status: "ACTIVE",
      },
    };
  }

  async cancelTransaction(): Promise<ProviderResult<{ cancelled: boolean }>> {
    return { ok: true, data: { cancelled: true } };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.ONKI_WEBHOOK_SECRET;
    if (!secret) return false; // fail-closed: 시크릿 미설정 시 검증 불가 → 거부
    if (!signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    // timingSafeEqual은 길이가 다르면 예외를 던지므로 사전에 길이 확인
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }
}
