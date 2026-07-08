import type { Metadata } from "next";
import { CategoryPostList } from "@/components/category-post-list";
import { CHURCH } from "@/data/church";

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
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Sermons
        </p>
        <h1
          className="mb-3 text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          설교 말씀
        </h1>
        <p className="mb-8 max-w-[52ch] text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          주일 말씀의 요약과 다시듣기 영상입니다. 글을 열면 영상과 나눔 질문을 함께 보실 수 있습니다.
        </p>
        <CategoryPostList categories={["SERMON"]} emptyTitle="아직 등록된 설교가 없어요." />
      </div>
    </section>
  );
}
