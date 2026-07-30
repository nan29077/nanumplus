import crypto from "crypto";
import { sendEmmaMt } from "@/lib/emma";
import type {
  InfobankSmsDonationAdapter,
  ProviderResult,
  SmsDonationInitRequest,
  SmsDonationInitResult,
  SmsMtRequest,
  SmsMtResult,
} from "./types";

/**
 * 인포뱅크 문자후원 Live 구현체 (EMMA PostgreSQL 에이전트 기반)
 *
 * EMMA 아키텍처:
 *  - MO(수신): 후원자가 #25401234 로 문자 → EMMA가 em_mo_log_YYYYMM 에 기록
 *              → /api/cron/emma-mo 크론이 1분마다 폴링해 Donation 생성
 *  - MT(발신): 나눔플러스가 em_mt_log_YYYYMM 에 INSERT → EMMA가 픽업해 SMS 발송
 *
 * 활성화 방법 (.env):
 *   INFOBANK_PROVIDER=live
 *   EMMA_ID=01          # 인포뱅크에서 부여한 2자리 EMMA 인스턴스 ID
 *   INFOBANK_MT_SENDER_NUMBER=0212345678  # 등록된 발신 번호
 */
export class InfobankLiveAdapter implements InfobankSmsDonationAdapter {
  readonly providerName = "infobank" as const;

  async initDonation(
    req: SmsDonationInitRequest
  ): Promise<ProviderResult<SmsDonationInitResult>> {
    if (req.amount <= 0) {
      return {
        ok: false,
        errorCode: "INVALID_AMOUNT",
        message: "후원 금액이 올바르지 않습니다.",
      };
    }

    // EMMA 기반에서는 후원자가 직접 SMS를 보내므로 별도 거래 초기화 불필요.
    // 기관의 SMS 번호를 안내하는 가이드 메시지만 반환한다.
    const txId = `EMMA-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    return {
      ok: true,
      data: {
        providerTransactionId: txId,
        smsNumber: req.smsFullNumber,
        guideMessage:
          `${req.smsFullNumber} 번호로 문자를 보내시면 ` +
          `${req.amount.toLocaleString("ko-KR")}원이 후원됩니다. ` +
          `(문자 내용은 자유롭게 작성하셔도 됩니다)`,
      },
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.INFOBANK_WEBHOOK_SECRET;
    // EMMA는 DB 폴링 방식이므로 웹훅 서명 검증이 필요 없지만,
    // 레거시 웹훅 엔드포인트는 시크릿 미설정 시 fail-closed로 거부한다.
    if (!secret) return false;
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    // timingSafeEqual은 길이가 다르면 예외를 던지므로 사전에 길이 확인
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  }

  async sendMt(req: SmsMtRequest): Promise<ProviderResult<SmsMtResult>> {
    const result = await sendEmmaMt({
      recipientPhone: req.recipientPhone,
      senderPhone: req.senderNumber,
      content: req.message,
      moKey: req.providerTransactionId,
    });

    if (result.status === "ERROR") {
      return {
        ok: false,
        errorCode: "EMMA_MT_ERROR",
        message: result.message ?? "EMMA MT 발송 큐 등록 실패",
      };
    }

    return {
      ok: true,
      data: {
        messageId: result.mtKey,
        status: "QUEUED",
      },
    };
  }
}
