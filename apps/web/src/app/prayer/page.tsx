import type { Metadata } from "next";
import PrayerClient from "./prayer-client";
import { CHURCH } from "@/data/church";

export const metadata: Metadata = {
  title: "기도벽",
  description: `${CHURCH.name} 성도의 기도제목을 함께 나누고 중보하는 기도벽`,
};

// 교인만 공개(MEMBERS) 기도제목은 로그인 쿠키가 있어야 조회되므로 서버 선주입 없이
// 클라이언트가 인증 쿠키로 직접 조회한다(교제 피드와 동일한 전략).
export default function PrayerPage() {
  return <PrayerClient />;
}
