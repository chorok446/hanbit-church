import type { Metadata } from "next";
import Link from "next/link";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";

export const metadata: Metadata = {
  title: "새가족 안내",
  description: `${CHURCH.name}에 처음 오신 분을 위한 안내`,
};

const STEPS = [
  {
    title: "예배에 오세요",
    body: `주일 예배(${WORSHIP_SERVICES[1]?.time ?? "주일 오전"})에 오시면 됩니다. 편한 복장으로 오셔도 괜찮습니다.`,
  },
  {
    title: "안내 데스크를 찾아주세요",
    body: "예배 후 로비의 새가족 안내 데스크에서 등록 카드를 작성하고 환영 선물을 받으세요.",
  },
  {
    title: "새가족 교육",
    body: "몇 주간의 새가족 교육을 통해 교회를 알아가고, 맞는 부서와 목장을 안내받습니다.",
  },
  {
    title: "공동체와 함께",
    body: "홈페이지 회원가입 후 교제 공간과 행사 신청에 참여하실 수 있습니다.",
  },
];

export default function WelcomePage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Welcome
        </p>
        <h1
          className="text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          처음 오셨나요?
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-8" style={{ color: "var(--foreground-muted)" }}>
          {CHURCH.name}은 한 분 한 분을 기쁨으로 환영합니다. 아래 순서를 따라오시면 자연스럽게
          공동체의 한 가족이 되실 수 있습니다.
        </p>

        <ol className="mt-10 space-y-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-6 rounded-2xl border px-7 py-6"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
                style={{ background: "var(--surface-deep)", color: "var(--accent)" }}
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2
                  className="text-[18px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  {step.title}
                </h2>
                <p className="mt-1.5 text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          >
            회원가입 하기
          </Link>
          <Link
            href="/worship"
            className="rounded-full border px-8 py-3.5 text-[15px] font-medium"
            style={{ borderColor: "rgba(var(--ink-rgb), 0.35)", color: "var(--heading)" }}
          >
            예배 안내 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
