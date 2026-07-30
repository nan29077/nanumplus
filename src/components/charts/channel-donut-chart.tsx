"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS: Record<string, string> = {
  SMS: "#0ea5e9",
  EASY_TRANSFER: "#1b7a5a",
  RECURRING_TRANSFER: "#f59e0b",
};

export function ChannelDonutChart({
  data,
}: { data: { channel: string; name: string; amount: number }[] }) {
  if (!data.length || data.every((d) => d.amount === 0)) {
    return <p className="py-20 text-center text-sm text-stone-400">표시할 후원 데이터가 없습니다.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data} dataKey="amount" nameKey="name"
          innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.channel} fill={COLORS[d.channel] ?? "#a8a29e"} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toLocaleString("ko-KR")}원`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
