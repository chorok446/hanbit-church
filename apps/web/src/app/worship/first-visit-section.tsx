import Link from "next/link";

/** "처음 오셨나요?" — 풀블리드 네이비 밴드, 2열(안내 본문 | 새가족/오시는 길 CTA). */
export function FirstVisitSection() {
  return (
    <section className="px-6 py-24" style={{ background: "var(--banner-bg)" }}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
          <h2
            className="mt-2 text-[28px] text-[var(--on-banner)] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            처음 오셨나요?
          </h2>
          <p className="mt-4 max-w-[56ch] text-[14.5px] leading-[29px]" style={{ color: "rgba(var(--on-banner-rgb), 0.75)" }}>
            예배 시작 10분 전까지 오시면 여유 있게 자리에 앉으실 수 있습니다. 본당 입구에서 안내
            위원이 좌석과 주보를 안내해 드리며, 예배 후에는 새가족 안내를 통해 교회를 더 알아가실 수
            있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/welcome"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[var(--on-banner)] px-8 py-3 text-[14px] font-medium text-[var(--banner-bg)] transition-opacity hover:opacity-90"
          >
            새가족 안내 보기
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border px-8 py-3 text-[14px] font-medium text-[var(--on-banner)] transition-colors hover:bg-white/10"
            style={{ borderColor: "rgba(var(--on-banner-rgb), 0.35)" }}
          >
            오시는 길 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
