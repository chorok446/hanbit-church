import type { Metadata } from "next";
import { NewsHero, NewsQuickLinks } from "./news-hero";
import { NewsPostList } from "./news-post-list";
import { StaffWriteButton } from "@/components/staff-write-button";
import { apiGetIsr } from "@/lib/api";
import { NEWS_PAGE_SIZE, type PostSearchResponse } from "@/data/posts";
import { CHURCH } from "@/data/church";

export const metadata: Metadata = {
  title: "소식",
  description: `${CHURCH.name} 공지사항과 주보`,
};

// ISR: 첫 탭(공지) 첫 페이지를 서버에서 선주입(60초 재검증) — SEO·LCP 개선. API 미가용(CI 빌드)이면
// null 로 두고 기존 클라이언트 fetch 경로가 그대로 동작한다.
export const revalidate = 60;

// 소식: 히어로 밴드(네이비) → 핵심 안내 3열 바(-32px 겹침) → 탭·검색·목록(썸네일 카드)
export default async function NewsPage() {
  const initialNotices = await apiGetIsr<PostSearchResponse>(
    `/api/posts/search?category=NOTICE&sort=latest&page=0&size=${NEWS_PAGE_SIZE}`,
  );
  return (
    <>
      <NewsHero />
      <NewsQuickLinks />

      <section className="px-6 pt-14 pb-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-[840px]">
          <div className="mb-6 flex items-center justify-end">
            {/* 스태프(콘텐츠 관리 권한)에게만 보이는 전용 작성 진입점 */}
            <StaffWriteButton href="/news/write" label="소식 작성" />
          </div>

          <NewsPostList initialData={initialNotices} />
        </div>
      </section>
    </>
  );
}
