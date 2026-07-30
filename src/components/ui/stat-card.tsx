import type { LucideIcon } from "lucide-react";
import { cn, formatKRW, formatNumber } from "@/lib/utils";

type CardColor = "green" | "blue" | "amber" | "violet" | "sky" | "teal" | "rose" | "orange" | "default";

const colorStyles: Record<CardColor, { card: string; icon: string; label: string; value: string }> = {
  green:   { card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/60", icon: "bg-emerald-100 text-emerald-600", label: "text-emerald-700", value: "text-emerald-900" },
  blue:    { card: "border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/60",         icon: "bg-blue-100 text-blue-600",       label: "text-blue-700",    value: "text-blue-900" },
  amber:   { card: "border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/60",      icon: "bg-amber-100 text-amber-600",     label: "text-amber-700",   value: "text-amber-900" },
  violet:  { card: "border-violet-100 bg-gradient-to-br from-violet-50 to-violet-100/60",   icon: "bg-violet-100 text-violet-600",   label: "text-violet-700",  value: "text-violet-900" },
  sky:     { card: "border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100/60",            icon: "bg-sky-100 text-sky-600",         label: "text-sky-700",     value: "text-sky-900" },
  teal:    { card: "border-teal-100 bg-gradient-to-br from-teal-50 to-teal-100/60",         icon: "bg-teal-100 text-teal-600",       label: "text-teal-700",    value: "text-teal-900" },
  rose:    { card: "border-rose-100 bg-gradient-to-br from-rose-50 to-rose-100/60",         icon: "bg-rose-100 text-rose-600",       label: "text-rose-700",    value: "text-rose-900" },
  orange:  { card: "border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100/60",   icon: "bg-orange-100 text-orange-600",   label: "text-orange-700",  value: "text-orange-900" },
  default: { card: "border-stone-200 bg-white",                                              icon: "bg-brand-50 text-brand-600",      label: "text-stone-500",   value: "text-stone-900" },
};

export function StatCard({
  label, value, icon: Icon, unit = "krw", hint, color = "default", className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  unit?: "krw" | "count";
  hint?: string;
  color?: CardColor;
  className?: string;
}) {
  const s = colorStyles[color];
  return (
    <div className={cn("rounded-2xl border p-5 shadow-card", s.card, className)}>
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-medium", s.label)}>{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", s.icon)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", s.value)}>
        {unit === "krw" ? formatKRW(value) : `${formatNumber(value)}건`}
      </p>
      {hint && <p className={cn("mt-1 text-xs opacity-70", s.label)}>{hint}</p>}
    </div>
  );
}
