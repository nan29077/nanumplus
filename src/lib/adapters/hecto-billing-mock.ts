import crypto from "crypto";
import type {
  HectoBillingAdapter, ProviderResult,
  BillingKeyIssueRequest, BillingKeyIssueResult,
  BillingChargeRequest, BillingChargeResult,
} from "./types";

/**
 * 핵토(Hecto) 신용카드 정기후원 — 빌링키 Mock 구현체.
 * 실제 연동 시 HECTO_BILLING_PROVIDER=live 로 바꾸고 hecto-billing-live.ts 를 구현한다.
 * Mock 은 발급/청구를 즉시 성공 처리한다. 카드 원문은 다루지 않는다.
 */
export class HectoBillingMockAdapter implements HectoBillingAdapter {
  readonly providerName = "hecto" as const;

  async issueBillingKey(
    req: BillingKeyIssueRequest
  ): Promise<ProviderResult<BillingKeyIssueResult>> {
    return {
      ok: true,
      data: {
        billingKeyRef: `HECTO-BK-MOCK-${crypto.randomUUID()}`,
        cardIssuer: req.cardIssuer ?? "테스트카드",
        cardLast4: req.cardLast4 ?? "1234",
      },
    };
  }

  async chargeBillingKey(
    req: BillingChargeRequest
  ): Promise<ProviderResult<BillingChargeResult>> {
    if (req.amount < 1000) {
      return { ok: false, errorCode: "MIN_AMOUNT", message: "최소 결제 금액은 1,000원입니다." };
    }
    return {
      ok: true,
      data: {
        providerTransactionId: `HECTO-CH-MOCK-${crypto.randomUUID()}`,
        status: "COMPLETED",
      },
    };
  }

  async deleteBillingKey(): Promise<ProviderResult<{ deleted: boolean }>> {
    return { ok: true, data: { deleted: true } };
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
