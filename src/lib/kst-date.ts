import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear,
  subDays, subMonths, addDays, eachDayOfInterval,
  type Locale,
} from "date-fns";

export const KST = "Asia/Seoul";

/** 현재 시각을 KST 기준 Date(벽시계)로 */
export function nowKst(): Date {
  return toZonedTime(new Date(), KST);
}

/** KST 벽시계 Date → 실제 UTC Date */
export function kstToUtc(d: Date): Date {
  return fromZonedTime(d, KST);
}

/**
 * 항상 KST(Asia/Seoul) 기준으로 날짜/시간을 포맷한다.
 * Date·ISO 문자열·timestamp(number) 모두 허용하며, 사용자 로컬 타임존과 무관하게
 * 서버/클라이언트 어디서 호출해도 동일한 KST 결과를 반환한다.
 */
export function fmtKst(
  d: Date | string | number,
  pattern = "yyyy-MM-dd",
  opts?: { locale?: Locale }
) {
  const date = d instanceof Date ? d : new Date(d);
  return formatInTimeZone(date, KST, pattern, opts);
}

/** 오늘 날짜(KST)를 yyyy-MM-dd 문자열로 반환 (로컬 타임존 무관) */
export function todayKst(): string {
  return formatInTimeZone(new Date(), KST, "yyyy-MM-dd");
}

/** KST 기준 YYYYMM 문자열 (EMMA 테이블 suffix 등) */
export function ymKst(d: Date | string | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d);
  return formatInTimeZone(date, KST, "yyyyMM");
}

/** KST 기준 전월 YYYYMM 문자열 */
export function prevYmKst(d: Date | string | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = Number(formatInTimeZone(date, KST, "yyyy"));
  const m = Number(formatInTimeZone(date, KST, "MM"));
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}${String(pm).padStart(2, "0")}`;
}

export type PeriodKey = "today" | "7d" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

export function periodRange(
  key: PeriodKey,
  custom?: { from: string; to: string }
): { from: Date; to: Date; label: string } {
  const now = nowKst();
  switch (key) {
    case "today":
      return { from: kstToUtc(startOfDay(now)), to: kstToUtc(endOfDay(now)), label: "오늘" };
    case "7d":
      return { from: kstToUtc(startOfDay(subDays(now, 6))), to: kstToUtc(endOfDay(now)), label: "최근 7일" };
    case "thisMonth":
      return { from: kstToUtc(startOfMonth(now)), to: kstToUtc(endOfMonth(now)), label: "이번 달" };
    case "lastMonth": {
      const lm = subMonths(now, 1);
      return { from: kstToUtc(startOfMonth(lm)), to: kstToUtc(endOfMonth(lm)), label: "지난 달" };
    }
    case "thisYear":
      return { from: kstToUtc(startOfYear(now)), to: kstToUtc(endOfDay(now)), label: "올해" };
    case "custom": {
      const from = custom?.from ? new Date(`${custom.from}T00:00:00+09:00`) : kstToUtc(startOfDay(now));
      const to = custom?.to ? new Date(`${custom.to}T23:59:59.999+09:00`) : kstToUtc(endOfDay(now));
      return { from, to, label: "직접 선택" };
    }
  }
}

/** KST 기준 해당 월의 [시작, 끝] UTC 범위와 날짜 목록 */
export function kstMonthRange(year: number, month: number) {
  const first = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
  const firstKst = toZonedTime(first, KST);
  const from = kstToUtc(startOfMonth(firstKst));
  const to = kstToUtc(endOfMonth(firstKst));
  const days = eachDayOfInterval({ start: startOfMonth(firstKst), end: endOfMonth(firstKst) });
  return { from, to, days };
}

export { addDays, eachDayOfInterval };
