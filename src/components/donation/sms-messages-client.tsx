"use client";

import { useState } from "react";
import { LayoutGrid, List, MessageSquare, Phone, Clock } from "lucide-react";
import { SmsDonationGrid, type SmsDonationRow } from "@/components/donation/sms-donation-card";
import { StatusBadge } from "@/components/ui/badge";
import { formatKRW } from "@/lib/utils";
import { maskPhone } from "@/lib/masking";
import { fmtKst } from "@/lib/kst-date";

export function SmsMessagesClient({ rows, themeColor }: { rows: SmsDonationRow[]; themeColor: string }) {
  const [view, setView] = useState<"card" | "list">("card");

  const Toggle = ({ v, icon: Icon, label }: { v: "card" | "list"; icon: typeof LayoutGrid; label: string }) => {
    const on = view === v;
    return (
      <button onClick={() => setView(v)}
        style={on ? { backgroundColor: themeColor, color: "#fff" } : {}}
        className={"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium " + (on ? "" : "text-stone-600 hover:bg-stone-100")}>
        <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">총 {rows.length.toLocaleString("ko-KR")}건</p>
        <div className="flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
          <Toggle v="card" icon={LayoutGrid} label="카드형" />
          <Toggle v="list" icon={List} label="리스트형" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-16 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-stone-300" strokeWidth={1.5} />
          <p className="font-medium text-stone-500">아직 문자후원 내역이 없습니다</p>
        </div>
      ) : view === "card" ? (
        <SmsDonationGrid rows={rows} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
          {/* 데스크톱 테이블 */}
          <table className="hidden w-full text-sm sm:table">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3">금액</th>
                <th className="px-4 py-3">문자 내용</th>
                <th className="px-4 py-3">발신번호</th>
                <th className="px-4 py-3">일시</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-900">{formatKRW(r.amount)}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {r.smsBody ? <span className="line-clamp-1">{r.smsBody}</span> : <span className="italic text-stone-400">내용 미수신</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-500">{r.senderPhone ? maskPhone(r.senderPhone) : "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-400">{fmtKst(new Date(r.donatedAt), "yyyy.MM.dd HH:mm")}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 모바일 리스트 */}
          <ul className="divide-y divide-stone-100 sm:hidden">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">{formatKRW(r.amount)}</span>
                  <StatusBadge status={r.status} />
                </div>
                {r.smsBody
                  ? <p className="mt-1 line-clamp-1 text-sm text-stone-600">{r.smsBody}</p>
                  : <p className="mt-1 text-xs italic text-stone-400">내용 미수신</p>}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" strokeWidth={1.75} /> {r.senderPhone ? maskPhone(r.senderPhone) : "-"}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" strokeWidth={1.75} /> {fmtKst(new Date(r.donatedAt), "yyyy.MM.dd HH:mm")}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
