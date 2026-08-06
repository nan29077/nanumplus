import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

const siteName = "나눔플러스";
const siteDescription =
  "문자후원, 간편 계좌이체, 정기후원을 한 곳에서. 사회복지기관을 위한 투명한 후원금 모금 관리 플랫폼.";
function getRequestOrigin() {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host) {
    const protocol = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005";
}

export function generateMetadata(): Metadata {
  const origin = getRequestOrigin();
  const imageUrl = `${origin}/api/og-image`;

  return {
    metadataBase: new URL(origin),
    applicationName: siteName,
    title: {
      default: "나눔플러스 — 사회복지기관 후원금 모금 플랫폼",
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    alternates: { canonical: origin },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: origin,
      siteName,
      title: "나눔플러스 — 나눔을 더 가깝게, 후원을 더 투명하게",
      description: siteDescription,
      images: [
        {
          url: imageUrl,
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
      images: [imageUrl],
    },
    icons: { icon: "/icon.svg" },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
