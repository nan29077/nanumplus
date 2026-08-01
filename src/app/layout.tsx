import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const siteName = "나눔플러스";
const siteDescription =
  "문자후원, 간편 계좌이체, 정기후원을 한 곳에서. 사회복지기관을 위한 투명한 후원금 모금 관리 플랫폼.";
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "나눔플러스 — 사회복지기관 후원금 모금 플랫폼",
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName,
    title: "나눔플러스 — 나눔을 더 가깝게, 후원을 더 투명하게",
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "나눔플러스 사회복지기관 후원금 모금 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "나눔플러스 — 나눔을 더 가깝게, 후원을 더 투명하게",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
