import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { StaffWriteButton } from "@/components/staff-write-button";
import { SermonList } from "./sermon-list";

export const metadata: Metadata = {
  title: "설교",
  description: `${CHURCH.name} 주일 설교 말씀과 다시듣기`,
};

export default function SermonsPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Sermons
        </p>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h1
            className="text-[32px] sm:text-[38px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            설교 말씀
          </h1>
          {/* 스태프(콘텐츠 관리 권한)에게만 보이는 전용 등록 진입점 */}
          <StaffWriteButton href="/sermons/write" label="설교 등록" />
        </div>
        <p className="mb-8 max-w-[52ch] text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          주일 말씀의 요약과 다시듣기 영상입니다. 글을 열면 영상과 나눔 질문을 함께 보실 수 있습니다.
        </p>
        <SermonList />
      </div>
    </section>
  );
}
