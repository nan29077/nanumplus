import type {
  InfobankSmsDonationAdapter,
  OnkiTransferAdapter,
  HectoTransferAdapter,
  HectoBillingAdapter,
} from "./types";
import { InfobankMockAdapter } from "./infobank-mock";
import { InfobankLiveAdapter } from "./infobank-live";
import { OnkiMockAdapter } from "./onki-mock";
import { HectoTransferMockAdapter } from "./hecto-transfer-mock";
import { HectoBillingMockAdapter } from "./hecto-billing-mock";

/**
 * Provider Factory.
 *
 * 문자후원(SMS):        INFOBANK_PROVIDER=live  → InfobankLiveAdapter (EMMA)
 * 간편 계좌이체/계좌정기: HECTO_TRANSFER_PROVIDER=live → (TODO) hecto-transfer-live
 * 카드 정기(빌링키):     HECTO_BILLING_PROVIDER=live  → (TODO) hecto-billing-live
 *
 * 핵토 실연동 자료 확보 전까지는 Mock 을 사용한다.
 * (레거시 온기 어댑터는 getOnkiAdapter 로 남겨두되 신규 경로는 핵토를 사용한다.)
 */
export function getInfobankAdapter(): InfobankSmsDonationAdapter {
  const mode = process.env.INFOBANK_PROVIDER ?? "mock";
  if (mode === "live") {
    return new InfobankLiveAdapter();
  }
  return new InfobankMockAdapter();
}

/** 간편 계좌이체 / 계좌 정기후원 — 핵토 내통장결제. */
export function getTransferAdapter(): HectoTransferAdapter {
  const mode = process.env.HECTO_TRANSFER_PROVIDER ?? "mock";
  if (mode === "live") {
    throw new Error("Hecto transfer live adapter not yet implemented. Add hecto-transfer-live.ts.");
  }
  return new HectoTransferMockAdapter();
}

/** 신용카드 정기후원 — 핵토 빌링키. */
export function getBillingAdapter(): HectoBillingAdapter {
  const mode = process.env.HECTO_BILLING_PROVIDER ?? "mock";
  if (mode === "live") {
    throw new Error("Hecto billing live adapter not yet implemented. Add hecto-billing-live.ts.");
  }
  return new HectoBillingMockAdapter();
}

/** @deprecated 레거시 온기 어댑터. 신규 경로는 getTransferAdapter() 사용. */
export function getOnkiAdapter(): OnkiTransferAdapter {
  const mode = process.env.ONKI_PROVIDER ?? "mock";
  if (mode === "live") {
    throw new Error("ONKI live adapter not yet implemented. Add onki-live.ts.");
  }
  return new OnkiMockAdapter();
}

export * from "./types";
