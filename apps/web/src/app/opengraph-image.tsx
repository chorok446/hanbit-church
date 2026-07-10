import { ImageResponse } from "next/og";
import { CHURCH } from "@/data/church";

// 카카오톡·SNS 공유 미리보기(1200×630) — 모던 클래식 톤(딥네이비 + 골드 십자가 + 크림 텍스트).
// 한글은 빌드 시 Google Fonts 서브셋(text= 필요한 글자만)을 받아 그리고, 네트워크가 없으면
// 영문 교회명만으로 폴백한다(API 없는 CI 빌드도 성공해야 한다).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "철마제일교회";

async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:woff2?|opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    return await (await fetch(fontUrl)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const title = CHURCH.name; // "철마제일교회"
  const font = await loadKoreanFont(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f2a44",
          gap: 36,
        }}
      >
        {/* 골드 십자가 */}
        <div style={{ display: "flex", position: "relative", width: 66, height: 92 }}>
          <div style={{ position: "absolute", left: 27, top: 0, width: 12, height: 92, borderRadius: 5, background: "#c9a227" }} />
          <div style={{ position: "absolute", left: 0, top: 26, width: 66, height: 12, borderRadius: 5, background: "#c9a227" }} />
        </div>
        {font ? (
          <div style={{ display: "flex", fontFamily: "NotoSerifKR", fontSize: 88, color: "#f6f3ea" }}>{title}</div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 1, background: "#c9a227" }} />
          <div style={{ display: "flex", fontSize: font ? 26 : 44, letterSpacing: 10, color: "#c9a227" }}>
            {CHURCH.nameEn.toUpperCase()}
          </div>
          <div style={{ width: 56, height: 1, background: "#c9a227" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "NotoSerifKR", data: font, weight: 600 as const, style: "normal" as const }] : undefined,
    },
  );
}
