import { fmtKst } from "@/lib/kst-date";
import type { DonationRow } from "@/components/donation/donation-table";

type RawDonation = {
  id: string;
  amount: number;
  channel: string;
  status: string;
  donatedAt: Date;
  donor?: { name: string } | null;
  organization?: { name: string } | null;
  campaign?: { title: string } | null;
};

export function toDonationRow(d: RawDonation): DonationRow {
  return {
    id: d.id,
    amount: d.amount,
    channel: d.channel,
    status: d.status,
    donatedAt: fmtKst(d.donatedAt, "yyyy-MM-dd HH:mm"),
    donorName: d.donor?.name ?? "익명",
    orgName: d.organization?.name,
    campaignTitle: d.campaign?.title ?? null,
  };
}
