/**
 * 후원 내역 목록 상단의 기간 합계
 *
 *   이번 달 · 조회 42건 · 완료 40건 · 완료 금액 120,000원
 *
 * - 조회 건수: 지금 고른 조건(기관·채널·상태·기간) 그대로의 건수 = 아래 목록의 총 건수
 * - 완료 건수·금액: 그 조건 안에서 "완료" 상태만. 대기·실패·취소 금액이 모금액에
 *   섞여 부풀려 보이지 않도록 금액은 완료 기준으로만 낸다.
 */
export function PeriodSummary({
  label,
  total,
  completedCount,
  completedAmount,
}: {
  label: string;
  total: number;
  completedCount: number;
  completedAmount: number;
}) {
  const n = (v: number) => v.toLocaleString("ko-KR");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
      <span className="font-semibold text-stone-900">{label}</span>
      <span className="text-stone-500">
        조회 <b className="font-semibold text-stone-800">{n(total)}</b>건
      </span>
      <span className="text-stone-500">
        완료 <b className="font-semibold text-stone-800">{n(completedCount)}</b>건
      </span>
      <span className="text-stone-500">
        완료 금액 <b className="font-semibold text-brand-700">{n(completedAmount)}</b>원
      </span>
    </div>
  );
}
