import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { GreetingSection } from "./greeting-section";
import { VisionSection } from "./vision-section";
import { HistorySection } from "./history-section";
import { CommunitySection } from "./community-section";
import { LocationSection } from "./location-section";
import { VisitCtaSection } from "./visit-cta-section";

export const metadata: Metadata = {
  title: "교회소개",
  description: `${CHURCH.name} 소개 — 인사말, 비전, 교회 발자취, 함께하는 공동체, 오시는 길`,
};

export default function AboutPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          About
        </p>
        <h1
          className="text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          교회소개
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-8" style={{ color: "var(--foreground-muted)" }}>
          {CHURCH.name}는 말씀과 예배를 중심으로 지역과 다음세대를 섬기는 믿음의 공동체입니다.
        </p>

        <GreetingSection />
        <VisionSection />
        <HistorySection />
        <CommunitySection />
        <LocationSection />
        <VisitCtaSection />
      </div>
    </section>
  );
}
