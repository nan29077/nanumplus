import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="나눔플러스"
      className={cn("h-9 w-9", className)}
    >
      <rect width="40" height="40" rx="12" fill="#245744" />
      <ellipse cx="20" cy="12.5" rx="4.2" ry="7.4" fill="#FFF5D9" />
      <ellipse cx="27" cy="17.5" rx="4.2" ry="7.4" fill="#FFF8E8" transform="rotate(72 27 17.5)" />
      <ellipse cx="24.5" cy="25.5" rx="4.2" ry="7.4" fill="#F6B98E" transform="rotate(144 24.5 25.5)" />
      <ellipse cx="15.5" cy="25.5" rx="4.2" ry="7.4" fill="#FFF3D1" transform="rotate(216 15.5 25.5)" />
      <ellipse cx="13" cy="17.5" rx="4.2" ry="7.4" fill="#FFF9E9" transform="rotate(288 13 17.5)" />
      <circle cx="20" cy="20" r="3.3" fill="#F2C562" />
    </svg>
  );
}
