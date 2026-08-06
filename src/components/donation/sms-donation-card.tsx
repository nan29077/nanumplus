import { MessageSquare, Phone, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { fmtKst } from "@/lib/kst-date";
import { maskPhone } from "@/lib/masking";

export type SmsDonationRow = {
  id: string;
  smsBody: string | null;
  senderPhone: string | null;   // 이름 없이 전화번호만 수신
  donatedAt: string;            // ISO string
  amount: number;
  status: string;
  orgName?: string | null;      // admin 전용
  recipientNumber?: string | null; // 수신 번호 (기관 미배정 시 표시)
};

/** 01012345678 → 010-****-5678 형식으로 마스킹 (donor-table과 동일 정책) */
function formatPhone(phone: string | null): string {
  if (!phone) return "번호 미수신";
  return maskPhone(phone);
}

function statusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" strokeWidth={2} />완료
        </span>
      );
    case "FAILED":
      return (
        <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
          <XCircle className="h-3 w-3" strokeWidth={2} />실패
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-500">
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />대기
        </span>
      );
  }
}

/** ISO 문자열 → KST 기준 날짜+시간 표시 */
function formatDonatedAt(iso: string) {
  return fmtKst(new Date(iso), "yyyy.MM.dd HH:mm");
}

export function SmsDonationCard({ row }: { row: SmsDonationRow }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-card transition-shadow hover:shadow-md">
      {/* 상단: 아이콘 + 금액 + 상태 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-base font-bold text-stone-900">{formatKRW(row.amount)}</p>
            {"orgName" in row && (
              <p className={`text-[11px] ${row.orgName ? "text-stone-400" : "text-amber-500 font-medium"}`}>
                {row.orgName
                  ? row.orgName
                  : row.recipientNumber
                  ? `기관배정 없음 (${row.recipientNumber})`
                  : "기관배정 없음"}
              </p>
            )}
          </div>
        </div>
        {statusBadge(row.status)}
      </div>

      {/* 문자 내용 말풍선 */}
      <div className="relative min-h-[52px] rounded-xl rounded-tl-sm bg-stone-50 px-3 py-2.5">
        <span className="absolute -left-2 top-3 h-0 w-0 border-b-[6px] border-r-[8px] border-t-[6px] border-b-transparent border-r-stone-50 border-t-transparent" />
        {row.smsBody ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
            {row.smsBody}
          </p>
        ) : (
          <p className="text-xs italic text-stone-400">
            문자 내용 미수신 — API 연동 후 자동 표시됩니다
          </p>
        )}
      </div>

      {/* 하단: 발신자 전화번호 + 일시 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={1.75} />
          <span className="text-xs font-semibold text-stone-700 tracking-wide">
            {formatPhone(row.senderPhone)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-stone-400">
          <Clock className="h-3 w-3" strokeWidth={1.75} />
          {formatDonatedAt(row.donatedAt)}
        </div>
      </div>
    </div>
  );
}

export function SmsDonationGrid({ rows }: { rows: SmsDonationRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-16 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-stone-300" strokeWidth={1.5} />
        <p className="font-medium text-stone-500">아직 문자후원 내역이 없습니다</p>
        <p className="text-sm text-stone-400">
          후원자가 기관 문자후원 번호로 문자를 보내면 여기에 기록됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <SmsDonationCard key={row.id} row={row} />
      ))}
    </div>
  );
}
