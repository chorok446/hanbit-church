import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { WorshipHero } from "./worship-hero";
import { ServiceList } from "./service-list";
import { BeforeWorshipSection } from "./before-worship-section";
import { FirstVisitSection } from "./first-visit-section";
import { DirectionsOnlineSection } from "./directions-online-section";

export const metadata: Metadata = {
  title: "예배안내",
  description: `${CHURCH.name} 예배 시간과 장소, 처음 방문 안내`,
};

// 예배안내: 히어로 밴드 → 예배 시간표(에디토리얼) → 예배 전 안내(웜크림) → 처음 오셨나요(네이비) → 오시는 길·온라인(2열)
export default function WorshipPage() {
  return (
    <>
      <WorshipHero />
      <ServiceList />
      <BeforeWorshipSection />
      <FirstVisitSection />
      <DirectionsOnlineSection />
    </>
  );
}
