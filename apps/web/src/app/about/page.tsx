import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { AboutHero } from "./about-hero";
import { GreetingSection } from "./greeting-section";
import { VisionSection } from "./vision-section";
import { HistoryCommunitySection } from "./history-community-section";
import { ServantsSection } from "./servants-section";
import { LocationSection } from "./location-section";
import { VisitCtaSection } from "./visit-cta-section";

export const metadata: Metadata = {
  title: "교회소개",
  description: `${CHURCH.name} 소개 — 인사말, 비전, 교회 발자취, 함께하는 공동체, 오시는 길`,
};

// 교회소개: 히어로 밴드 → 인사말(에디토리얼) → 비전(웜크림 밴드) → 발자취·공동체(2열) → 섬기는 사람들 → 오시는 길 → 방문 CTA(네이비)
export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <GreetingSection />
      <VisionSection />
      <HistoryCommunitySection />
      <ServantsSection />
      <LocationSection />
      <VisitCtaSection />
    </>
  );
}
