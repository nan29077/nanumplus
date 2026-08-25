"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, HandCoins, Building2, RefreshCw, CreditCard, Trash2, Loader2 } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { ChannelBadge, StatusBadge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type Donation = {
  id: string; amount: number; channel: string; status: string;
  donatedAt: string; orgName: string | null; orgSlug: string | null; campaignTitle: string | null;
};
type Recurring = {
  id: string; amount: number; dayOfMonth: number; method: string; status: string;
  orgName: string | null; orgSlug: string | null; cardIssuer: string | null; cardLast4: string | null;
};
type Card = {
  id: string; cardIssuer: string | null; cardLast4: string | null; orgName: string | null; issuedAt: string;
};

export function DonorMyClient({
  donor, summary, donations, recurrings, cards,
}: {
  donor: { name: string; email: string | null; image: string | null };
  summary: { totalAmount: number; orgCount: number; activeRecurring: number };
  donations: Donation[];
  recurrings: Recurring[];
  cards: Card[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const cancelRecurring = async (id: string) => {
    if (!confirm("이 정기후원을 해지할까요?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/donor/recurring/${id}/cancel`, { method: "POST" });
      if (!res.ok) alert("해지에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      else router.refresh();
    } finally { setBusyId(null); }
  };
  const deleteCard = async (id: string) => {
    if (!confirm("이 카드를 삭제하면 연결된 정기후원도 함께 해지됩니다. 계속할까요?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/donor/billing/${id}`, { method: "DELETE" });
      if (!res.ok) alert("삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      else router.refresh();
    } finally { setBusyId(null); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          {donor.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={donor.image} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 font-bold">
              {donor.name.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="font-bold text-stone-900">{donor.name} 님</p>
            {donor.email && <p className="text-xs text-stone-400">{donor.email}</p>}
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50">
          <LogOut className="h-4 w-4" strokeWidth={1.75} /> 로그아웃
        </button>
      </div>

      {/* 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { icon: HandCoins, label: "누적 후원금", value: formatKRW(summary.totalAmount) },
          { icon: Building2, label: "후원한 기관", value: `${summary.orgCount}곳` },
          { icon: RefreshCw, label: "진행 중 정기후원", value: `${summary.activeRecurring}건` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-card">
            <s.icon className="mx-auto h-4 w-4 text-brand-600" strokeWidth={1.75} />
            <p className="mt-1.5 text-base font-bold text-stone-900">{s.value}</p>
            <p className="text-[11px] text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 정기후원 관리 */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-stone-900">정기후원 관리</h2>
        {recurrings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-10 text-center text-sm text-stone-400">
            진행 중인 정기후원이 없습니다.
          </p>
        ) : (
          <div className="space-y-2.5">
            {recurrings.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900">{r.orgName ?? "기관"}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    매월 {r.dayOfMonth}일 · {formatKRW(r.amount)} ·{" "}
                    {r.method === "CARD"
                      ? `카드${r.cardLast4 ? ` (${r.cardIssuer ?? ""} ****${r.cardLast4})` : ""}`
                      : "계좌 자동이체"}
                  </p>
                </div>
                {r.status === "ACTIVE" && (
                  <button onClick={() => cancelRecurring(r.id)} disabled={busyId === r.id}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "해지"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 등록 카드 */}
      {cards.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-bold text-stone-900">등록된 카드</h2>
          <div className="space-y-2.5">
            {cards.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-5 w-5 text-violet-500" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      {c.cardIssuer ?? "카드"} {c.cardLast4 ? `****${c.cardLast4}` : ""}
                    </p>
                    <p className="text-[11px] text-stone-400">{c.orgName ?? ""}</p>
                  </div>
                </div>
                <button onClick={() => deleteCard(c.id)} disabled={busyId === c.id}
                  className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-50">
                  {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3.5 w-3.5" /> 삭제</>}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 후원 내역 */}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-stone-900">후원 내역</h2>
        {donations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-10 text-center text-sm text-stone-400">
            아직 후원 내역이 없습니다. 마음이 가는 기관에 첫 후원을 시작해 보세요.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-3">일시</th>
                  <th className="px-4 py-3">기관 / 캠페인</th>
                  <th className="px-4 py-3">방법</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">{d.donatedAt}</td>
                    <td className="px-4 py-3">
                      {d.orgSlug ? (
                        <Link href={`/donate/${d.orgSlug}`} className="font-medium text-stone-800 hover:text-brand-600">{d.orgName ?? "기관"}</Link>
                      ) : (
                        <span className="font-medium text-stone-800">{d.orgName ?? "기관"}</span>
                      )}
                      {d.campaignTitle && <span className="block text-[11px] text-stone-400">{d.campaignTitle}</span>}
                    </td>
                    <td className="px-4 py-3"><ChannelBadge channel={d.channel} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900">{formatKRW(d.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
