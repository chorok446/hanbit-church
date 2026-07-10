import { ImageResponse } from "next/og";

// iOS 홈 화면 아이콘(180×180 PNG) — icon.svg(딥네이비 + 골드 십자가)와 동일 디자인을
// ImageResponse 로 빌드 시 생성한다(iOS 는 SVG 파비콘·매니페스트 아이콘을 쓰지 않는다).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f2a44",
        }}
      >
        <div style={{ display: "flex", position: "relative", width: 90, height: 120 }}>
          <div
            style={{
              position: "absolute",
              left: 36,
              top: 0,
              width: 18,
              height: 120,
              borderRadius: 6,
              background: "#c9a227",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 34,
              width: 90,
              height: 18,
              borderRadius: 6,
              background: "#c9a227",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
