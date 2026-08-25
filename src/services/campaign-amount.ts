/**
 * 캠페인 모금액(Campaign.currentAmount) 동기화 헬퍼.
 *
 * M-6: 후원이 COMPLETED로 전환될 때는 가산하면서, 취소·실패·환불·soft delete로
 * 빠져나갈 때는 되돌리지 않아 모금액이 실제 모금 총액보다 부풀려지던 문제를 해결한다.
 * "COMPLETED인 후원만 모금액에 포함된다"는 하나의 규칙으로 증감을 계산한다.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DonationStatusKey = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** 상태 전이에 따른 모금액 증감폭. COMPLETED에 들어오면 +, 빠져나가면 -. */
export function campaignAmountDelta(
  prevStatus: string,
  nextStatus: string,
  amount: number
): number {
  const before = prevStatus === "COMPLETED" ? amount : 0;
  const after = nextStatus === "COMPLETED" ? amount : 0;
  return after - before;
}

/**
 * 캠페인 모금액을 delta 만큼 조정한다. (0이면 아무 것도 하지 않음)
 * 음수로 내려가지 않도록 GREATEST(0, ...)로 하한을 둔다.
 */
export async function applyCampaignAmountDelta(
  db: DbClient,
  campaignId: string | null | undefined,
  delta: number
): Promise<void> {
  if (!campaignId || delta === 0) return;
  await db.$executeRaw`
    UPDATE "Campaign"
       SET "currentAmount" = GREATEST(0, "currentAmount" + ${delta}),
           "updatedAt" = NOW()
     WHERE id = ${campaignId}
  `;
}

/** 후원 상태 전이에 맞춰 캠페인 모금액을 동기화한다. */
export async function syncCampaignAmountOnStatusChange(
  db: DbClient,
  donation: { campaignId: string | null; amount: number; status: string },
  nextStatus: string
): Promise<void> {
  await applyCampaignAmountDelta(
    db,
    donation.campaignId,
    campaignAmountDelta(donation.status, nextStatus, donation.amount)
  );
}

/**
 * 후원 취소 / soft delete 시 모금액에서 해당 금액을 되돌린다.
 * (COMPLETED 였던 후원만 실제로 차감된다)
 */
export async function revertCampaignAmountForDonation(
  db: DbClient,
  donation: { campaignId: string | null; amount: number; status: string }
): Promise<void> {
  if (donation.status !== "COMPLETED") return;
  await applyCampaignAmountDelta(db, donation.campaignId, -donation.amount);
}
