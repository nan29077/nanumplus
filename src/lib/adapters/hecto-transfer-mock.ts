import crypto from "crypto";
import type {
  HectoTransferAdapter, ProviderResult,
  TransferInitRequest, TransferInitResult,
  RecurringInitRequest, RecurringInitResult,
} from "./types";

/**
 * 핵토(Hecto) 간편 계좌이체 "내통장결제" Mock 구현체.
 * 실제 연동 시 HECTO_TRANSFER_PROVIDER=live 로 바꾸고 hecto-transfer-live.ts 를 구현한다.
 * Mock 은 즉시 COMPLETED 를 반환한다. (실연동은 PENDING + redirectUrl → 웹훅 완료)
 */
export class HectoTransferMockAdapter implements HectoTransferAdapter {
  readonly providerName = "hecto" as const;

  async initEasyTransfer(
    req: TransferInitRequest
  ): Promise<ProviderResult<TransferInitResult>> {
    if (req.amount < 1000) {
      return { ok: false, errorCode: "MIN_AMOUNT", message: "최소 후원 금액은 1,000원입니다." };
    }
    return {
      ok: true,
      data: {
        providerTransactionId: `HECTO-TR-MOCK-${crypto.randomUUID()}`,
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
        providerContractId: `HECTO-RC-MOCK-${crypto.randomUUID()}`,
        status: "ACTIVE",
      },
    };
  }

  async cancelTransaction(): Promise<ProviderResult<{ cancelled: boolean }>> {
    return { ok: true, data: { cancelled: true } };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.HECTO_WEBHOOK_SECRET;
    if (!secret || !signature) return false; // fail-closed
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
