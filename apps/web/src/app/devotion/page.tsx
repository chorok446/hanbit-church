import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { StaffWriteButton } from "@/components/staff-write-button";
import { apiGetIsr } from "@/lib/api";
import { DEVOTION_PAGE_SIZE, devotionListPath, type DevotionPageResponse } from "@/data/devotion";
import { DevotionList } from "./devotion-list";

export const metadata: Metadata = {
  title: "큐티 · 오늘의 말씀",
  description: `${CHURCH.name} 데일리 큐티 — 매일의 말씀과 묵상, 은혜나눔`,
};

// ISR: 첫 페이지 목록을 서버에서 선주입(60초 재검증). API 미가용(CI 빌드)이면 null → 클라이언트 fetch 폴백.
export const revalidate = 60;

export default async function DevotionPage() {
  const initial = await apiGetIsr<DevotionPageResponse>(devotionListPath(0, DEVOTION_PAGE_SIZE));
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
              <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
              <h1
                className="text-[34px] sm:text-[40px] text-[var(--on-banner)]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                오늘의 말씀
              </h1>
            </div>
            <StaffWriteButton href="/devotion/write" label="큐티 등록" />
          </div>
          <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(var(--on-banner-rgb), 0.78)" }}>
            매일의 말씀 한 구절과 짧은 묵상입니다. 글을 열어 함께 은혜를 나눠 보세요.
          </p>
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-3xl">
          <DevotionList initialData={initial} />
        </div>
      </section>
    </>
  );
}
