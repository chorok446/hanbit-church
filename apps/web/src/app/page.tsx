import { ChurchHero } from "@/components/church-hero";
import { apiGetIsr } from "@/lib/api";
import { HOME_NEWS_PREVIEW_SIZE, type Post, type PostSearchResponse } from "@/data/posts";
import { HomeQuickInfo } from "@/components/home-quick-info";
import { WorshipSummary } from "@/components/worship-summary";
import { HomeWeeklySchedule } from "@/components/home-weekly-schedule";
import { HomeVisit } from "@/components/home-visit";
import { HomeIdentity } from "@/components/home-identity";
import { HomePhotos } from "@/components/home-photos";
import { HomeNews } from "@/components/home-news";
import { HomeCommunity } from "@/components/home-community";

// ISR: 최신 소식(공지·주보)을 서버에서 선주입(60초 재검증) — 홈 LCP·SEO.
// API 미가용(CI 빌드)이면 null 로 두고 기존 클라이언트 fetch 경로가 동작한다.
export const revalidate = 60;

// 홈 내러티브: 말씀(Hero) → 핵심 정보 스트립 → 예배 → 이번 주 일정 → 오시는길·새가족 → 교회 정체성·사진 → 최신 소식 → 교제·행사
export default async function Home() {
  const previewQuery = (category: string) =>
    apiGetIsr<PostSearchResponse>(`/api/posts/search?category=${category}&sort=latest&page=0&size=${HOME_NEWS_PREVIEW_SIZE}`);
  const [notices, bulletins] = await Promise.all([previewQuery("NOTICE"), previewQuery("BULLETIN")]);
  // 둘 다 실패(null)면 클라이언트 fetch 폴백, 일부 실패는 빈 배열로 합친다(home-news 병합 규칙과 동일).
  const initialNews: Post[] | null = notices === null && bulletins === null
    ? null
    : [...(notices?.content ?? []), ...(bulletins?.content ?? [])].slice(0, HOME_NEWS_PREVIEW_SIZE);
  return (
    <>
      <ChurchHero />
      <HomeQuickInfo />
      <WorshipSummary />
      <HomeWeeklySchedule />
      <HomeVisit />
      <HomeIdentity />
      <HomePhotos />
      <HomeNews initialPosts={initialNews} />
      <HomeCommunity />
    </>
  );
}
