import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "나눔플러스 — 사회복지기관 후원금 모금 플랫폼",
  description:
    "문자후원, 간편 계좌이체, 정기후원을 한 곳에서. 사회복지기관을 위한 투명한 후원금 모금 관리 SaaS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
