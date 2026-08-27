/**
 * 후원자 상태 파생 로직 (서버·클라이언트 공용, 순수 함수).
 *
 * DB에 "후원자 상태" 컬럼은 없다. 정기후원(RecurringDonation) 보유 현황과
 * 마지막 완료 후원일을 조합해 화면에 표시할 상태를 계산한다.
 */

/** 마지막 후원 이후 이 일수가 지나면 휴면으로 본다 */
export const DORMANT_DAYS = 180;

export type DonorStatusKey = "active" | "stopped" | "dormant" | "onetime" | "none";

export type DonorStatusInput = {
  /** 활성(ACTIVE) 정기후원 건수 */
  activeRecurring: number;
  /** 전체 정기후원 건수 (해지·중지 포함) */
  recurringTotal: number;
  /** 마지막 완료 후원일 (없으면 null) */
  lastDonatedAt: Date | string | null;
};

const META: Record<DonorStatusKey, { label: string; tone: "green" | "amber" | "gray" | "blue" }> = {
  active: { label: "정기 후원 중", tone: "green" },
  stopped: { label: "정기 중단", tone: "amber" },
  dormant: { label: "휴면", tone: "gray" },
  onetime: { label: "일시 후원", tone: "blue" },
  none: { label: "후원 이력 없음", tone: "gray" },
};

export function resolveDonorStatus(input: DonorStatusInput, now: Date = new Date()) {
  const key = resolveDonorStatusKey(input, now);
  return { key, ...META[key] };
}

export function resolveDonorStatusKey(input: DonorStatusInput, now: Date = new Date()): DonorStatusKey {
  if (input.activeRecurring > 0) return "active";
  if (input.recurringTotal > 0) return "stopped";
  if (!input.lastDonatedAt) return "none";
  const last = input.lastDonatedAt instanceof Date ? input.lastDonatedAt : new Date(input.lastDonatedAt);
  if (Number.isNaN(last.getTime())) return "none";
  if (now.getTime() - last.getTime() > DORMANT_DAYS * 24 * 60 * 60 * 1000) return "dormant";
  return "onetime";
}

export function donorStatusLabel(key: DonorStatusKey): string {
  return META[key].label;
}
