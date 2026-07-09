import Link from "next/link";
import { CHURCH } from "@/data/church";

/** 인사말 — 크림 밴드, 에디토리얼 중앙 정렬. 리드 문장(명조 대형) + 본문 + 담임목사 서명 + CTA. */
export function GreetingSection() {
  return (
    <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-[820px] text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Greeting
        </p>
        <h2
          className="mt-2 text-[26px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          인사말
        </h2>
        <span aria-hidden className="mx-auto mt-5 block h-px w-12" style={{ background: "var(--accent)" }} />
        <p
          className="mx-auto mt-9 max-w-[26ch] text-[24px] leading-[1.7]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", textWrap: "balance" }}
        >
          하나님의 사랑 안에서, 이곳을 찾아주신 여러분을 기쁨으로 환영합니다.
        </p>
        {/* TODO(교회 확인): 인사말 본문 실제 내용으로 교체 */}
        <div className="mx-auto mt-7 max-w-[58ch] space-y-4 text-left text-[15px] leading-[30px]" style={{ color: "var(--foreground)" }}>
          <p>
            우리 교회는 하나님을 예배하고, 말씀 안에서 자라며, 서로 사랑으로 교제하고, 지역과 이웃을
            섬기는 믿음의 공동체입니다. 이곳에서 하나님의 은혜와 위로를 함께 누리시길 바랍니다.
          </p>
          <p>처음 오시는 분도, 오랜 성도님도 언제나 환영합니다. 주님 안에서 만나 뵙기를 소망합니다.</p>
          <p className="pt-1 text-right" style={{ color: "var(--foreground-muted)" }}>
            {`${CHURCH.name} 담임목사${CHURCH.pastor ? ` ${CHURCH.pastor}` : ""} 드림`}
          </p>
        </div>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/worship"
            className="rounded-full px-6 py-2.5 text-[13.5px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          >
            예배안내 보기
          </Link>
          <Link
            href="/welcome"
            className="rounded-full border px-6 py-2.5 text-[13.5px] font-medium transition-colors hover:bg-[var(--panel)]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            새가족 안내 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
