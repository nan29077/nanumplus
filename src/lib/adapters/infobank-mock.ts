import crypto from "crypto";
import type {
  InfobankSmsDonationAdapter, ProviderResult,
  SmsDonationInitRequest, SmsDonationInitResult,
  SmsMtRequest, SmsMtResult,
} from "./types";

/**
 * 인포뱅크 문자후원 Mock 구현체.
 * 실제 API 문서 확보 후 InfobankLiveAdapter를 같은 인터페이스로 구현해 교체한다.
 * (INFOBANK_PROVIDER=live + API 키는 .env에서 주입)
 */
export class InfobankMockAdapter implements InfobankSmsDonationAdapter {
  readonly providerName = "infobank" as const;

  async initDonation(
    req: SmsDonationInitRequest
  ): Promise<ProviderResult<SmsDonationInitResult>> {
    if (req.amount <= 0) {
      return { ok: false, errorCode: "INVALID_AMOUNT", message: "후원 금액이 올바르지 않습니다." };
    }
    return {
      ok: true,
      data: {
        providerTransactionId: `IFB-MOCK-${crypto.randomUUID()}`,
        smsNumber: req.smsFullNumber,
        guideMessage: `${req.smsFullNumber} 번호로 문자를 보내면 건당 ${req.amount.toLocaleString("ko-KR")}원이 후원됩니다.`,
      },
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.INFOBANK_WEBHOOK_SECRET;
    if (!secret) return true; // Mock 모드에서는 검증 생략
    if (!signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async sendMt(req: SmsMtRequest): Promise<ProviderResult<SmsMtResult>> {
    // Mock: 실제 발송 없이 성공 응답 반환 — 실제 연동 시 InfobankLiveAdapter 로 교체
    console.log(
      `[infobank-mock] MT 발송 시뮬레이션 → ${req.recipientPhone} | msg: "${req.message.substring(0, 30)}..."`
    );
    return {
      ok: true,
      data: {
        messageId: `IFB-MT-MOCK-${crypto.randomUUID()}`,
        status: "SENT",
      },
    };
  }
}
