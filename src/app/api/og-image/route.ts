import React from "react";
import { ImageResponse } from "next/og";
import { SocialCard, socialCardSize } from "@/components/social-card";

export const runtime = "edge";

export async function GET() {
  // ImageResponse는 (element, options) 2개 인자만 받는다.
  // 기존에는 headers를 세 번째 인자로 넘겨 타입 에러 + 캐시 헤더 미적용 상태였음.
  return new ImageResponse(React.createElement(SocialCard), {
    ...socialCardSize,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
