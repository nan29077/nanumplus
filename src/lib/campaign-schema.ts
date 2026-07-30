import { z } from "zod";

export const DONATION_CHANNELS = ["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"] as const;
export type DonationChannel = (typeof DONATION_CHANNELS)[number];

export const CHANNEL_LABELS: Record<DonationChannel, string> = {
  SMS: "문자후원",
  EASY_TRANSFER: "간편 계좌이체",
  RECURRING_TRANSFER: "정기후원",
};

export const campaignSchema = z.object({
  title: z.string().min(1, "캠페인 제목을 입력해 주세요.").max(120),
  coverImageUrl: z.string().url("이미지 URL 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  goalAmount: z.coerce.number().int().min(10000, "목표 금액은 1만원 이상이어야 합니다.").max(10_000_000_000),
  startDate: z.string().min(1, "시작일을 입력해 주세요."),
  endDate: z.string().min(1, "종료일을 입력해 주세요."),
  summary: z.string().max(300).optional().or(z.literal("")),
  story: z.string().max(8000).optional().or(z.literal("")),
  reason: z.string().max(3000).optional().or(z.literal("")),
  usagePlan: z.string().max(3000).optional().or(z.literal("")),
  beneficiary: z.string().max(500).optional().or(z.literal("")),
  messageToDonors: z.string().max(1000).optional().or(z.literal("")),
  allowedChannels: z
    .array(z.enum(DONATION_CHANNELS))
    .min(1, "후원 채널을 하나 이상 선택해 주세요.")
    .default(["SMS", "EASY_TRANSFER", "RECURRING_TRANSFER"]),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "CLOSED"]).optional(),
  isPublished: z.boolean().optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
