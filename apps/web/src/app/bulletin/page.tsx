import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { StaffWriteButton } from "@/components/staff-write-button";
import { apiGetIsr } from "@/lib/api";
import { BULLETIN_PAGE_SIZE, type PostSearchResponse } from "@/data/posts";
import { BulletinList } from "./bulletin-list";

export const metadata: Metadata = {
  title: "주보",
  description: `${CHURCH.name} 주보 — 주차별 예배 순서와 소식을 PDF 로 보고 내려받으세요.`,
};

// ISR: 첫 페이지 목록을 서버에서 선주입(60초 재검증). API 미가용(CI 빌드)이면 null → 클라이언트 fetch 폴백.
export const revalidate = 60;

export default async function BulletinPage() {
  const initialBulletins = await apiGetIsr<PostSearchResponse>(
    `/api/posts/search?category=BULLETIN&sort=latest&page=0&size=${BULLETIN_PAGE_SIZE}`,
  );
  return (
    <>
      <section className="relative overflow-hidden px-6 pb-16 pt-40" style={{ background: "var(--surface-dark)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                Bulletin
              </p>
              <h1
                className="text-[34px] sm:text-[40px] text-[var(--on-banner)]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                주보
              </h1>
            </div>
            {/* 주보 작성은 소식 작성 화면(공지·주보 공용)을 재사용한다 — 스태프에게만 노출 */}
            <StaffWriteButton href="/news/write" label="주보 등록" />
          </div>
          <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(var(--on-banner-rgb), 0.78)" }}>
            주차별 주보입니다. 글을 열면 예배 순서와 소식을 담은 PDF 를 페이지 안에서 바로 보시고
            내려받으실 수 있습니다.
          </p>
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-5xl">
          <BulletinList initialData={initialBulletins} />
        </div>
      </section>
    </>
  );
}
