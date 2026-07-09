import { ChurchHero } from "@/components/church-hero";
import { HomeQuickInfo } from "@/components/home-quick-info";
import { WorshipSummary } from "@/components/worship-summary";
import { HomeWeeklySchedule } from "@/components/home-weekly-schedule";
import { HomeVisit } from "@/components/home-visit";
import { HomeIdentity } from "@/components/home-identity";
import { HomePhotos } from "@/components/home-photos";
import { HomeNews } from "@/components/home-news";
import { HomeCommunity } from "@/components/home-community";

// 홈 내러티브: 말씀(Hero) → 핵심 정보 스트립 → 예배 → 이번 주 일정 → 오시는길·새가족 → 교회 정체성·사진 → 최신 소식 → 교제·행사
export default function Home() {
  return (
    <>
      <ChurchHero />
      <HomeQuickInfo />
      <WorshipSummary />
      <HomeWeeklySchedule />
      <HomeVisit />
      <HomeIdentity />
      <HomePhotos />
      <HomeNews />
      <HomeCommunity />
    </>
  );
}
