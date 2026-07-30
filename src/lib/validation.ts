import { z } from "zod";

export const phoneRegex = /^[0-9\-+\s]{8,20}$/;

export const transferInitSchema = z.object({
  organizationSlug: z.string().min(1, "기관 정보가 올바르지 않습니다."),
  campaignSlug: z.string().optional().nullable(),
  amount: z.coerce.number().int().min(1000, "최소 후원 금액은 1,000원입니다.").max(100_000_000),
  donorName: z.string().min(1, "이름을 입력해 주세요.").max(40),
  donorPhone: z.string().regex(phoneRegex, "연락처 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  donorEmail: z.string().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "개인정보 수집·이용에 동의해 주세요." }),
  }),
});

export const recurringInitSchema = transferInitSchema.extend({
  dayOfMonth: z.coerce.number().int().min(1).max(28),
});

/** SMS 문자후원은 건당 3,000원 고정 */
export const SMS_DONATION_AMOUNT = 3_000;

export const smsInitSchema = z.object({
  organizationId: z.string().min(1),
  campaignId: z.string().optional().nullable(),
  // amount는 서버에서 SMS_DONATION_AMOUNT로 고정 처리 (클라이언트 값 무시)
});

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
