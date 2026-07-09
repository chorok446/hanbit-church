import Link from "next/link";

/** "처음 오셨나요?" — 방문 안내 본문 + 새가족/오시는 길 CTA. */
export function FirstVisitSection() {
  return (
    <div
      className="rounded-3xl border px-8 py-10 sm:px-10"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <p
        className="text-[12px] font-semibold uppercase tracking-[0.3em]"
        style={{ color: "var(--accent-strong)" }}
      >
        First Visit
      </p>
      <h2
        className="mt-2 text-[24px] sm:text-[26px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        처음 오셨나요?
      </h2>
      <p className="mt-4 max-w-[56ch] text-[14.5px] leading-8" style={{ color: "var(--foreground-muted)" }}>
        예배 시작 10분 전까지 오시면 여유 있게 자리에 앉으실 수 있습니다. 본당 입구에서 안내
        위원이 좌석과 주보를 안내해 드리며, 예배 후에는 새가족 안내를 통해 교회를 더 알아가실 수
        있습니다.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/welcome"
          className="inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3 text-[14px] font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
        >
          새가족 안내 보기
        </Link>
        <Link
          href="/about"
          className="inline-flex min-h-11 items-center justify-center rounded-full border px-7 py-3 text-[14px] font-medium transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          오시는 길 보기
        </Link>
      </div>
    </div>
  );
}
