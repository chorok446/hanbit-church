import { CHURCH } from "@/data/church";

/**
 * 교회소개 페이지 히어로 밴드 — 네이비(surface-dark) 배경 + 골드 글로우.
 * 홈의 클래식 히어로와 같은 톤. 크림 텍스트는 배너 관례(#f6f3ea)를 따른다.
 */
export function AboutHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-40" style={{ background: "var(--surface-dark)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          About
        </p>
        <h1
          className="text-[34px] sm:text-[40px] text-[#f6f3ea]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          교회소개
        </h1>
        <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(246, 243, 234, 0.78)" }}>
          {CHURCH.name}는 말씀과 예배를 중심으로 지역과 다음세대를 섬기는 믿음의 공동체입니다.
        </p>
      </div>
    </section>
  );
}
