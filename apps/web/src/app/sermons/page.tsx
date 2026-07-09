import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { StaffWriteButton } from "@/components/staff-write-button";
import { SermonList } from "./sermon-list";

export const metadata: Metadata = {
  title: "설교",
  description: `${CHURCH.name} 주일 설교 말씀과 다시듣기`,
};

// 설교: 네이비 히어로 밴드 → 크림 본문 밴드(최신 설교 강조 + 필터·검색 + 에디토리얼 목록)
export default function SermonsPage() {
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
                Sermons
              </p>
              <h1
                className="text-[34px] sm:text-[40px] text-[#f6f3ea]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                설교 말씀
              </h1>
            </div>
            {/* 스태프(콘텐츠 관리 권한)에게만 보이는 전용 등록 진입점 */}
            <StaffWriteButton href="/sermons/write" label="설교 등록" />
          </div>
          <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(246, 243, 234, 0.78)" }}>
            주일 말씀의 요약과 다시듣기 영상입니다. 글을 열면 예배 영상과 나눔 질문을 함께
            보실 수 있습니다.
          </p>
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-5xl">
          <SermonList />
        </div>
      </section>
    </>
  );
}
