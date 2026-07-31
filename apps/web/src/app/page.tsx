import { ChurchHero } from "@/components/church-hero";
import { apiGetIsr } from "@/lib/api";
import { HOME_NEWS_PREVIEW_SIZE, type Post, type PostSearchResponse } from "@/data/posts";
import { UPCOMING_EVENTS_PATH, type Event } from "@/data/events";
import {
  mapManualToCalendarEvent,
  type CalendarEvent,
  type ManualCalendarEventResponse,
} from "@/data/calendar";
import { HomeQuickInfo } from "@/components/home-quick-info";
import { WorshipSummary } from "@/components/worship-summary";
import { HomeWeeklySchedule } from "@/components/home-weekly-schedule";
import { HomeVisit } from "@/components/home-visit";
import { HomeGreeting } from "@/components/home-greeting";
import { HomeNews } from "@/components/home-news";
import { HomeCommunity } from "@/components/home-community";
import { HomeDevotion } from "@/components/home-devotion";
import { TODAY_DEVOTION_PATH, type Devotion } from "@/data/devotion";
import type { PraiseSchedule } from "@/data/praise-team";
import { ScrollReveal } from "@/components/scroll-reveal";

// ISR: 최신 소식(공지·주보)을 서버에서 선주입(60초 재검증) — 홈 LCP·SEO.
// API 미가용(CI 빌드)이면 null 로 두고 기존 클라이언트 fetch 경로가 동작한다.
export const revalidate = 60;

// 홈 내러티브: 말씀(Hero) → 핵심 정보 스트립 → 예배 → 이번 주 일정 → 오시는길·새가족 → 담임목사 인사 → 최신 소식 → 교제·행사
// 정체성 4카드(git 히스토리 home-identity.tsx)는 자리표시 문구뿐이라 내렸다 — 교회가 실제 비전 문안을
// 확정하면 복원을 검토한다(빈 확신보다 인사말의 실제 목소리가 힘이 세다 — 4차 critique P2).
export default async function Home() {
  const previewQuery = (category: string) =>
    apiGetIsr<PostSearchResponse>(`/api/posts/search?category=${category}&sort=latest&page=0&size=${HOME_NEWS_PREVIEW_SIZE}`);
  // 이번 주 일정 시드 — 다가오는 행사(창 한정) + 수동 일정. 찬양팀 일정은 요청자 스코프라 클라이언트에서 조회한다.
  // 찬양팀 일정은 쿠키 없는 ISR fetch 라 서버가 PUBLIC 스코프로 좁혀 준다 — 홈 요약은 공개 일정만
  // 싣는다(교인 스코프 일정은 개인화 불가한 공유 캐시에 실을 수 없고, 찬양팀 페이지에서 전체가 보인다).
  const [notices, bulletins, upcomingEvents, manualEvents, devotion, praiseSchedules] = await Promise.all([
    previewQuery("NOTICE"),
    previewQuery("BULLETIN"),
    apiGetIsr<Event[]>(UPCOMING_EVENTS_PATH),
    apiGetIsr<ManualCalendarEventResponse[]>("/api/calendar"),
    apiGetIsr<Devotion>(TODAY_DEVOTION_PATH),
    apiGetIsr<PraiseSchedule[]>("/api/praise/schedules/public"),
  ]);
  // 둘 다 실패(null)면 클라이언트 fetch 폴백, 일부 실패는 빈 배열로 합친다(home-news 병합 규칙과 동일).
  const initialNews: Post[] | null = notices === null && bulletins === null
    ? null
    : [...(notices?.content ?? []), ...(bulletins?.content ?? [])].slice(0, HOME_NEWS_PREVIEW_SIZE);
  const initialManual: CalendarEvent[] | null = manualEvents === null ? null : manualEvents.map(mapManualToCalendarEvent);
  return (
    <>
      {/* Hero·퀵정보는 폴드 위(퀵정보는 -mt-10 로 히어로와 겹침)라 리빌 제외 — 페이지 전환 fade 로 충분.
          그 아래 내러티브 섹션만 스크롤 진입 시 은은하게 fade+rise 한다(reduced-motion 자동 무효). */}
      <ChurchHero />
      <HomeQuickInfo />
      <ScrollReveal><HomeDevotion devotion={devotion} /></ScrollReveal>
      <ScrollReveal><WorshipSummary /></ScrollReveal>
      <ScrollReveal><HomeWeeklySchedule initialEvents={upcomingEvents} initialManual={initialManual} initialPraise={praiseSchedules} /></ScrollReveal>
      <ScrollReveal><HomeVisit /></ScrollReveal>
      <ScrollReveal><HomeGreeting /></ScrollReveal>
      <ScrollReveal><HomeNews initialPosts={initialNews} /></ScrollReveal>
      <ScrollReveal><HomeCommunity /></ScrollReveal>
    </>
  );
}
