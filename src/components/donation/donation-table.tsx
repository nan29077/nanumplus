import { formatKRW } from "@/lib/utils";
import { ChannelBadge, StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export type DonationRow = {
  id: string;
  amount: number;
  channel: string;
  status: string;
  donatedAt: string; // yyyy-MM-dd HH:mm (KST)
  donorName: string;
  orgName?: string;
  campaignTitle?: string | null;
  senderPhone?: string | null; // SMS 채널 전용: 발신자 전화번호
};

export function DonationTable({ rows, showOrg = false }: { rows: DonationRow[]; showOrg?: boolean }) {
  if (rows.length === 0) {
    return <EmptyState title="후원 내역이 없습니다" description="조건에 해당하는 후원이 아직 없습니다." />;
  }
  const headers = [
    "일시",
    ...(showOrg ? ["기관"] : []),
    "후원자",
    "채널",
    "금액",
    "상태",
    "캠페인",
  ];
  return (
    <DataTable headers={headers}>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-stone-50/60">
          <td className="whitespace-nowrap px-4 py-3 text-stone-500">{r.donatedAt}</td>
          {showOrg && <td className="px-4 py-3 text-stone-600">{r.orgName}</td>}
          <td className="px-4 py-3">
            <p className="font-medium text-stone-800">{r.donorName}</p>
            {r.channel === "SMS" && r.senderPhone && (
              <p className="text-xs text-stone-400 tabular-nums">
                {r.senderPhone.replace(/\D/g, "").replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")}
              </p>
            )}
          </td>
          <td className="px-4 py-3"><ChannelBadge channel={r.channel} /></td>
          <td className="px-4 py-3 font-semibold text-stone-800">{formatKRW(r.amount)}</td>
          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          <td className="px-4 py-3 text-stone-500">{r.campaignTitle ?? "-"}</td>
        </tr>
      ))}
    </DataTable>
  );
}
