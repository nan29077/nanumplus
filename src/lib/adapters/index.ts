import type { InfobankSmsDonationAdapter, OnkiTransferAdapter } from "./types";
import { InfobankMockAdapter } from "./infobank-mock";
import { InfobankLiveAdapter } from "./infobank-live";
import { OnkiMockAdapter } from "./onki-mock";

/**
 * Provider Factory.
 * INFOBANK_PROVIDER=live -> EMMA Live adapter
 * ONKI_PROVIDER=live     -> Onki Live adapter (TBD)
 *
 * Live conditions (.env):
 *   INFOBANK_PROVIDER=live
 *   EMMA_ID=01
 *   INFOBANK_MT_SENDER_NUMBER=0212345678
 */
export function getInfobankAdapter(): InfobankSmsDonationAdapter {
  const mode = process.env.INFOBANK_PROVIDER ?? "mock";
  if (mode === "live") {
    return new InfobankLiveAdapter();
  }
  return new InfobankMockAdapter();
}

export function getOnkiAdapter(): OnkiTransferAdapter {
  const mode = process.env.ONKI_PROVIDER ?? "mock";
  if (mode === "live") {
    throw new Error("ONKI live adapter not yet implemented. Add onki-live.ts.");
  }
  return new OnkiMockAdapter();
}

export * from "./types";
