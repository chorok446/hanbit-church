import { CHURCH } from "@/data/church";

/** 예배안내 히어로 밴드 — 네이비(surface-dark) + 골드 글로우. 크림 텍스트는 배너 관례(var(--on-banner)). */
export function WorshipHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-40" style={{ background: "var(--surface-dark)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto max-w-5xl">
        <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
        <h1
          className="text-[34px] sm:text-[40px] text-[var(--on-banner)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          예배안내
        </h1>
        <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(var(--on-banner-rgb), 0.78)" }}>
          {CHURCH.name}의 모든 예배는 누구에게나 열려 있습니다. 처음 방문하시는 분도 편하게
          예배드릴 수 있도록 예배 전후로 안내를 도와드립니다.
        </p>
      </div>
    </section>
  );
}
