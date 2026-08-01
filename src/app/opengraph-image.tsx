import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "나눔플러스 사회복지기관 후원금 모금 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #f7fbf9 0%, #e5f5ed 55%, #d0ecdf 100%)",
          color: "#153d31",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -130,
            top: -190,
            width: 590,
            height: 590,
            borderRadius: 999,
            background: "rgba(39, 152, 111, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 120,
            bottom: -260,
            width: 530,
            height: 530,
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.7)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "72px 82px 68px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 94,
                height: 94,
                borderRadius: 25,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #27986f 0%, #16624a 100%)",
                boxShadow: "0 16px 38px rgba(22, 98, 74, 0.22)",
              }}
            >
              <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 14.4c-1-2.2-2.8-3-4.4-2.6-1.7.5-2.7 2.3-2.2 4 .6 2.1 3.2 4 6.6 6.1 3.4-2.1 6-4 6.6-6.1.5-1.7-.5-3.5-2.2-4-1.6-.4-3.4.4-4.4 2.6Z"
                  fill="#ffffff"
                />
                <path
                  d="M6 21c1.6 2.4 5.3 4.4 10 4.4S24.4 23.4 26 21"
                  stroke="#d7f2e3"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <path
                  d="M8.4 19.2c-.9.5-1.7 1.2-2.4 2.1M23.6 19.2c.9.5 1.7 1.2 2.4 2.1"
                  stroke="#d7f2e3"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5 }}>나눔플러스</div>
              <div style={{ marginTop: 5, fontSize: 20, color: "#518071" }}>사회복지기관 후원금 모금 플랫폼</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 890 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 58,
                lineHeight: 1.22,
                fontWeight: 800,
                letterSpacing: -2.5,
              }}
            >
              <span>나눔을 더 가깝게,</span>
              <span>후원을 더 투명하게</span>
            </div>
            <div style={{ marginTop: 25, fontSize: 25, lineHeight: 1.5, color: "#416c5e" }}>
              문자후원·간편 계좌이체·정기후원·캠페인을 한 곳에서 관리하세요.
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#267a5d", fontSize: 20, fontWeight: 700 }}>
            <span>문자후원</span><span style={{ color: "#91b8a9" }}>•</span>
            <span>QR 후원</span><span style={{ color: "#91b8a9" }}>•</span>
            <span>캠페인</span><span style={{ color: "#91b8a9" }}>•</span>
            <span>통계·정산</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
