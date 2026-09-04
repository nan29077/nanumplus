/** @type {import('next').NextConfig} */

// 콘텐츠 보안 정책(CSP)
//  - Next.js 는 하이드레이션 부트스트랩에 인라인 <script> 를 사용하므로 script-src 에 'unsafe-inline' 필요.
//  - 개발 모드(HMR)는 eval 을 사용하므로 'unsafe-eval' 을 개발에서만 허용한다.
//  - Tailwind/인라인 style 속성 때문에 style-src 는 'unsafe-inline' 필요.
//  - frame-ancestors 'self' 로 클릭재킹을 차단한다(X-Frame-Options 와 중복 적용).
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS 는 https 응답에서만 브라우저가 적용한다(로컬 http 에서는 무시됨).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  // 기동 시 환경변수 검증 (src/instrumentation.ts)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    // M-2: 와일드카드 "**" 대신 실제 사용 도메인만 허용
    // - images.unsplash.com: hero-slider 배경 이미지
    // 기관 로고·캠페인 이미지는 사용자 입력 URL이므로 <Image unoptimized> 사용
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
export default nextConfig;
