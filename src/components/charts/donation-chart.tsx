"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const won = (v: number) =>
  v >= 10000 ? `${Math.round(v / 10000)}만` : v.toLocaleString("ko-KR");

export function DailyLineChart({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a8a29e" }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={won} tick={{ fontSize: 11, fill: "#a8a29e" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString("ko-KR")}원`, "모금액"]} />
        <Line type="monotone" dataKey="amount" stroke="#1b7a5a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBarChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a8a29e" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={won} tick={{ fontSize: 11, fill: "#a8a29e" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString("ko-KR")}원`, "모금액"]} />
        <Bar dataKey="amount" fill="#49b389" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
