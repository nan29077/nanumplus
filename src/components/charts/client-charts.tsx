"use client";

import dynamic from "next/dynamic";

// recharts는 ResizeObserver / document 등 브라우저 API를 사용하므로
// SSR을 완전히 비활성화해 서버 렌더링 오류를 방지합니다.

const DailyLineChartDynamic = dynamic(
  () => import("./donation-chart").then((m) => m.DailyLineChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-stone-100" /> }
);

const MonthlyBarChartDynamic = dynamic(
  () => import("./donation-chart").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-stone-100" /> }
);

const ChannelDonutChartDynamic = dynamic(
  () => import("./channel-donut-chart").then((m) => m.ChannelDonutChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-xl bg-stone-100" /> }
);

export function DailyLineChart({ data }: { data: { date: string; amount: number }[] }) {
  return <DailyLineChartDynamic data={data} />;
}

export function MonthlyBarChart({ data }: { data: { month: string; amount: number }[] }) {
  return <MonthlyBarChartDynamic data={data} />;
}

export function ChannelDonutChart({
  data,
}: {
  data: { channel: string; name: string; amount: number }[];
}) {
  return <ChannelDonutChartDynamic data={data} />;
}
