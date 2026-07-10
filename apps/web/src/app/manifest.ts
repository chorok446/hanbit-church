import type { MetadataRoute } from "next";
import { CHURCH } from "@/data/church";

/**
 * 웹 앱 매니페스트 — 교인들이 홈 화면에 추가해 앱처럼 쓸 수 있게 한다.
 * 아이콘: SVG(모던 브라우저) + apple-icon(iOS 는 매니페스트 대신 apple-touch-icon 사용).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CHURCH.name,
    short_name: CHURCH.name,
    description: `${CHURCH.name} — 예배 안내, 설교, 교회 소식과 성도의 교제`,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#1f2a44",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
