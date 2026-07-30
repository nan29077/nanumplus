import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

/** 페이지네이션 상한 (skip 폭주 방지) */
export const MAX_PAGE = 9999;

/**
 * ?page= 쿼리 파라미터를 안전하게 파싱한다.
 * NaN/Infinity/음수/과대값을 모두 걸러 1~MAX_PAGE 범위의 정수를 반환한다.
 * (Number("abc") → NaN 이 그대로 skip 계산에 흘러들어 쿼리가 깨지는 문제 방지)
 */
export function parsePageParam(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}
