import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { ServiceList } from "./service-list";
import { FirstVisitSection } from "./first-visit-section";
import { BeforeWorshipSection } from "./before-worship-section";
import { DirectionsSection } from "./directions-section";
import { OnlineWorshipSection } from "./online-worship-section";

export const metadata: Metadata = {
  title: "예배안내",
  description: `${CHURCH.name} 예배 시간과 장소, 처음 방문 안내`,
};

export default function WorshipPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p
          className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]"
          style={{ color: "var(--accent-strong)" }}
        >
          Worship
        </p>
        <h1
          className="text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          예배안내
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-8" style={{ color: "var(--foreground-muted)" }}>
          {CHURCH.name}의 모든 예배는 누구에게나 열려 있습니다. 처음 방문하시는 분도 편하게
          예배드릴 수 있도록 예배 전후로 안내를 도와드립니다.
        </p>

        <ServiceList />

        <div className="mt-16">
          <FirstVisitSection />
        </div>

        <div className="mt-16">
          <BeforeWorshipSection />
        </div>

        <div className="mt-16">
          <DirectionsSection />
        </div>

        <div className="mt-10">
          <OnlineWorshipSection />
        </div>
      </div>
    </section>
  );
}
