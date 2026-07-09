import type { Metadata } from "next";
import Link from "next/link";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";
import { NewFamilyRegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "새가족 안내",
  description: `${CHURCH.name}에 처음 오신 분을 위한 안내`,
};

const sundayFirst = WORSHIP_SERVICES[0];
const sundaySecond = WORSHIP_SERVICES[1];

/** 처음 오시는 분을 위한 4단계 안내. 특정 예배 시간 하나만 강조하지 않는다. */
const newFamilySteps = [
  {
    title: "예배에 오세요",
    body: `${sundayFirst?.name}(${sundayFirst?.time}) 또는 ${sundaySecond?.name}(${sundaySecond?.time}) 중 편하신 시간에 오시면 됩니다. 편한 복장으로 오셔도 괜찮습니다.`,
  },
  {
    title: "안내 데스크를 찾아주세요",
    body: "예배 후 로비의 새가족 안내 데스크에 들러주세요. 인사를 나누고 궁금한 점을 편하게 안내해 드립니다.",
  },
  {
    title: "새가족 안내",
    body: "원하시는 경우 새가족 안내를 통해 교회와 예배를 차근차근 알아가고, 맞는 부서와 공동체를 소개받으실 수 있습니다.",
  },
  {
    title: "공동체와 함께",
    body: "예배와 교제 가운데 자연스럽게 공동체의 한 가족이 되어가시도록 함께 걷겠습니다.",
  },
];

const faqItems = [
  {
    question: "꼭 등록해야 하나요?",
    answer:
      "아니요, 등록은 의무가 아닙니다. 먼저 예배에 편하게 참석해 보시고, 원하시는 때에 등록하시면 됩니다. 등록 전이라도 언제든 환영합니다.",
  },
  {
    question: "혼자 가도 괜찮나요?",
    answer:
      "물론입니다. 혼자 처음 방문하시는 분들이 많습니다. 안내 데스크에서 자리와 예배 순서를 편안하게 도와드립니다.",
  },
  {
    question: "아이와 함께 가도 되나요?",
    answer:
      // TODO(교회 확인): 주일학교·유아 동반 예배 운영 여부 확인 후 구체화.
      "네, 가족 모두 환영합니다. 아이와 함께 예배에 참석하실 수 있으며, 자녀 예배에 대한 자세한 안내는 안내 데스크나 전화로 문의해 주세요.",
  },
  {
    question: "예배 후에는 무엇을 하면 되나요?",
    answer:
      "예배 후 로비의 새가족 안내 데스크에 들러주시면 인사를 나누고 다음 걸음을 안내해 드립니다. 물론 바로 가셔도 괜찮습니다.",
  },
];

/** 오시는 길과 안내 항목. TODO(교회 확인): 주차·안내 데스크 위치는 교회 확인 후 확정. */
const visitInfoItems: { label: string; value: string; href?: string }[] = [
  { label: "주소", value: CHURCH.address },
  { label: "주차", value: "교회 주차장을 이용하실 수 있습니다." },
  { label: "안내 데스크", value: "본당 로비 새가족 안내 데스크에서 도와드립니다." },
  { label: "문의 전화", value: CHURCH.phone, href: `tel:${CHURCH.phone.replace(/[^0-9+]/g, "")}` },
];

const smallCtaClass =
  "inline-flex min-h-11 items-center rounded-full border px-5 py-2.5 text-[14px] font-medium transition-colors";
const smallCtaStyle = { borderColor: "rgba(var(--ink-rgb), 0.35)", color: "var(--heading)" } as const;

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
        {eyebrow}
      </p>
      <h2
        className="text-[24px] sm:text-[26px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        {title}
      </h2>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        {/* 제목 + 상단 CTA */}
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
          {CHURCH.name}는 처음 오시는 한 분 한 분을 기쁨으로 환영합니다. 등록은 의무가 아니며,
          원하시는 경우 새가족 안내와 교제를 도와드립니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/worship" className={smallCtaClass} style={smallCtaStyle}>
            예배 시간 보기
          </Link>
          <Link href="/about" className={smallCtaClass} style={smallCtaStyle}>
            오시는 길 보기
          </Link>
        </div>

        {/* 4단계 안내 */}
        <ol className="mt-12 space-y-4">
          {newFamilySteps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-5 rounded-2xl border px-6 py-6 sm:gap-6 sm:px-7"
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

        {/* 새가족 등록 신청 폼 */}
        <div className="mt-14">
          <NewFamilyRegisterForm />
        </div>

        {/* 오시는 길과 안내 */}
        <div className="mt-14">
          <SectionHeading eyebrow="Visit" title="오시는 길과 안내" />
          <div
            className="mt-5 rounded-3xl border p-6 sm:p-8"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <dl className="space-y-4">
              {visitInfoItems.map((item) => (
                <div key={item.label} className="flex flex-col gap-1 sm:flex-row sm:gap-6">
                  <dt
                    className="w-28 shrink-0 text-[12px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "var(--accent-strong)" }}
                  >
                    {item.label}
                  </dt>
                  <dd className="text-[14.5px] leading-7" style={{ color: "var(--foreground)" }}>
                    {item.href ? (
                      <a href={item.href} className="underline-offset-4 hover:underline">
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <Link href="/about" className={smallCtaClass} style={smallCtaStyle}>
                오시는 길 보기
              </Link>
              <Link href="/worship" className={smallCtaClass} style={smallCtaStyle}>
                예배안내 보기
              </Link>
            </div>
          </div>
        </div>

        {/* 자주 묻는 질문 */}
        <div className="mt-14">
          <SectionHeading eyebrow="FAQ" title="자주 묻는 질문" />
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border px-6 py-1"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <summary
                  className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] [&::-webkit-details-marker]:hidden"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  {item.question}
                  <span
                    aria-hidden
                    className="shrink-0 text-[18px] transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    style={{ color: "var(--accent-strong)" }}
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* 하단 CTA */}
        <div
          className="mt-14 rounded-3xl border px-6 py-10 text-center sm:px-10"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2
            className="text-[22px] sm:text-[24px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            처음 방문을 준비하고 계신가요?
          </h2>
          <p className="mt-2 text-[14.5px]" style={{ color: "var(--foreground-muted)" }}>
            예배 시간과 오시는 길을 미리 확인해 보세요.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/worship"
              className="inline-flex min-h-12 items-center rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              예배 안내 보기
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center rounded-full border px-8 py-3.5 text-[15px] font-medium"
              style={smallCtaStyle}
            >
              오시는 길 보기
            </Link>
          </div>
          <p className="mt-6 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            홈페이지 소식과 교제에 참여하고 싶으시다면{" "}
            <Link href="/signup" className="underline underline-offset-4" style={{ color: "var(--heading)" }}>
              회원가입
            </Link>
            을 해보세요.
          </p>
        </div>
      </div>
    </section>
  );
}
