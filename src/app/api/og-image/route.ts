import React from "react";
import { ImageResponse } from "next/og";
import { SocialCard, socialCardSize } from "@/components/social-card";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(React.createElement(SocialCard), socialCardSize, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
