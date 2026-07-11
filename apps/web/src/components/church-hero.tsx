import Link from "next/link";
import { CHURCH, verseOfMonth } from "@/data/church";

/** 홈 히어로 — 이달의 말씀. 서버 컴포넌트(요청 시점의 월 기준). */
export function ChurchHero() {
  const verse = verseOfMonth();

  return (
    <section
      className="relative overflow-hidden px-6 pb-24 pt-44 text-center transition-colors sm:pb-32 sm:pt-52"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <div className="absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-[var(--accent)] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <p
          className="mb-8 text-[12px] font-semibold tracking-[0.42em] sm:text-[13px]"
          style={{ color: "var(--accent-strong)" }}
        >
          {CHURCH.name} · {CHURCH.nameEn}
        </p>

        <blockquote className="m-0">
          <p
            className="mx-auto max-w-[22ch] text-[28px] leading-[1.55] sm:text-[40px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", textWrap: "balance", wordBreak: "keep-all" }}
          >
            “{verse.text}”
          </p>
          <cite className="mt-5 block text-[14px] not-italic" style={{ color: "var(--foreground-muted)" }}>
            <span aria-hidden style={{ color: "var(--accent)" }}>— </span>
            {verse.ref}
            <span aria-hidden style={{ color: "var(--accent)" }}> —</span>
          </cite>
        </blockquote>

        <p
          className="mx-auto mt-10 max-w-[40ch] text-[14px] leading-7 sm:text-[15px]"
          style={{ color: "var(--foreground-muted)", textWrap: "balance" }}
        >
          우리 마을에서 예배와 말씀, 교제와 섬김으로 함께 걷는 공동체입니다.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/worship"
            className="cta-solid rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            예배 안내
          </Link>
          <Link
            href="/welcome"
            className="rounded-full border px-8 py-3.5 text-[15px] font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ borderColor: "rgba(var(--ink-rgb), 0.35)", color: "var(--heading)" }}
          >
            처음 오셨나요?
          </Link>
        </div>
      </div>
    </section>
  );
}
