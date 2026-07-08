import { ChurchHero } from "@/components/church-hero";
import { WorshipSummary } from "@/components/worship-summary";
import { HomeCommunity } from "@/components/home-community";

// 홈 내러티브: 말씀(Hero) → 예배 초대 → 교제·행사 → 새가족 환영
export default function Home() {
  return (
    <>
      <ChurchHero />
      <WorshipSummary />
      <HomeCommunity />
    </>
  );
}
