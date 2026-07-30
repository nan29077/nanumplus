import { Wallet, Hash, Calculator } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { DailyLineChart, MonthlyBarChart, ChannelDonutChart } from "@/components/charts/client-charts";

type Report = {
  label: string;
  from: string;
  to: string;
  totalAmount: number;
  avgAmount: number;
  count: number;
  byChannel: { channel: string; _sum: { amount: number | null }; _count: number }[];
};

const CHANNEL_LABEL: Record<string, string> = {
  SMS: "문자후원",
  EASY_TRANSFER: "간편 계좌이체",
  RECURRING_TRANSFER: "정기후원",
};

export function ReportView({
  report, daily, monthly, channel,
}: {
  report: Report;
  daily: { date: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  channel: { channel: string; name: string; amount: number }[];
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-stone-500">
        {report.label} · {report.from} ~ {report.to}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="기간 모금액" value={report.totalAmount} icon={Wallet} />
        <StatCard label="후원 건수" value={report.count} icon={Hash} unit="count" />
        <StatCard label="평균 후원액" value={report.avgAmount} icon={Calculator} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">최근 30일 일별 모금액</h2>
          <DailyLineChart data={daily} />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">채널별 비중</h2>
          <ChannelDonutChart data={channel} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">최근 12개월 월별 모금액</h2>
          <MonthlyBarChart data={monthly} />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-stone-900">채널별 상세</h2>
          <ul className="space-y-2">
            {report.byChannel.length === 0 && <li className="text-sm text-stone-400">데이터가 없습니다.</li>}
            {report.byChannel.map((c) => (
              <li key={c.channel} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm">
                <span className="text-stone-600">{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                <span className="text-right">
                  <b className="text-stone-800">{formatKRW(c._sum.amount ?? 0)}</b>
                  <span className="ml-2 text-xs text-stone-400">{c._count}건</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
