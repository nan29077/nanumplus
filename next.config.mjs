/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // M-2: 와일드카드 "**" 대신 실제 사용 도메인만 허용
    // - images.unsplash.com: hero-slider 배경 이미지
    // 기관 로고·캠페인 이미지는 사용자 입력 URL이므로 <Image unoptimized> 사용
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};
export default nextConfig;
