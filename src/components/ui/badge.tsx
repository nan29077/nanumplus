import { cn } from "@/lib/utils";

const tones = {
  green: "bg-brand-50 text-brand-700 ring-brand-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  gray: "bg-stone-100 text-stone-600 ring-stone-200",
} as const;

export function Badge({
  children, tone = "gray", className,
}: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      tones[tone], className
    )}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: keyof typeof tones }> = {
    PENDING: { label: "대기", tone: "amber" },
    COMPLETED: { label: "완료", tone: "green" },
    FAILED: { label: "실패", tone: "red" },
    CANCELLED: { label: "취소", tone: "gray" },
    REFUNDED: { label: "환불", tone: "blue" },
    ACTIVE: { label: "진행 중", tone: "green" },
    PAUSED: { label: "일시중지", tone: "amber" },
    DRAFT: { label: "임시저장", tone: "gray" },
    ENDED: { label: "종료", tone: "gray" },
    CLOSED: { label: "마감", tone: "gray" },
  };
  const v = map[status] ?? { label: status, tone: "gray" as const };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

export function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { label: string; tone: keyof typeof tones }> = {
    SMS: { label: "문자후원", tone: "blue" },
    EASY_TRANSFER: { label: "간편 계좌이체", tone: "green" },
    RECURRING_TRANSFER: { label: "정기후원", tone: "amber" },
  };
  const v = map[channel] ?? { label: channel, tone: "gray" as const };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}
