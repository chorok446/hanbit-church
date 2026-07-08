import type { Metadata } from "next";
import { CategoryPostList } from "@/components/category-post-list";
import { CHURCH } from "@/data/church";

export const metadata: Metadata = {
  title: "소식",
  description: `${CHURCH.name} 공지사항과 주보`,
};

export default function NewsPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          News
        </p>
        <h1
          className="mb-8 text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          교회 소식
        </h1>
        <CategoryPostList categories={["NOTICE", "BULLETIN"]} emptyTitle="아직 등록된 소식이 없어요." />
      </div>
    </section>
  );
}
