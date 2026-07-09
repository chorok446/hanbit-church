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

const outlineCtaClass =
  "inline-flex min-h-11 items-center rounded-full border px-6 py-2.5 text-[13.5px] font-medium transition-colors hover:bg-[var(--panel)]";
const outlineCtaStyle = { borderColor: "rgba(var(--ink-rgb), 0.25)", color: "var(--heading)" } as const;

// 새가족: 히어로(네이비) → 4단계(크림) → 등록 신청(웜크림 2열) → 오시는 길 안내(크림 2열) → FAQ → 마무리 CTA(네이비)
export default function WelcomePage() {
  return (
    <>
      <section className="relative overflow-hidden px-6 pb-16 pt-40" style={{ background: "var(--surface-dark)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative mx-auto max-w-5xl">
          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Welcome
          </p>
          <h1
            className="text-[34px] sm:text-[40px] text-[#f6f3ea]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            처음 오셨나요?
          </h1>
          <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(246, 243, 234, 0.78)" }}>
            {CHURCH.name}는 처음 오시는 한 분 한 분을 기쁨으로 환영합니다. 등록은 의무가 아니며,
            원하시는 경우 새가족 안내와 교제를 도와드립니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/worship"
              className="inline-flex min-h-11 items-center rounded-full bg-[#f6f3ea] px-6 py-2.5 text-[14px] font-medium text-[#1f2a44] transition-opacity hover:opacity-90"
            >
              예배 시간 보기
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-11 items-center rounded-full border px-6 py-2.5 text-[14px] font-medium text-[#f6f3ea] transition-colors hover:bg-white/10"
              style={{ borderColor: "rgba(246, 243, 234, 0.4)" }}
            >
              오시는 길 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-5xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            Steps
          </p>
          <h2 className="mt-2 text-[28px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
            이렇게 함께 걸어요
          </h2>
          <ol className="mt-11 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {newFamilySteps.map((step, index) => (
              <li key={step.title} className="border-t pt-5" style={{ borderColor: "rgba(var(--ink-rgb), 0.25)" }}>
                <p
                  aria-hidden
                  className="text-[22px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--accent)" }}
                >
                  {index + 1}
                </p>
                <h3
                  className="mt-2.5 text-[17.5px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  {step.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[25px]" style={{ color: "var(--foreground-muted)" }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface-muted)" }}>
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-14 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
              Register
            </p>
            <h2 className="mt-2 text-[28px] leading-[1.45]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
              새가족 등록 신청
            </h2>
            <span aria-hidden className="mt-5 block h-px w-12" style={{ background: "var(--accent)" }} />
            <p className="mt-5 max-w-[36ch] text-[14.5px] leading-[28px]" style={{ color: "var(--foreground-muted)" }}>
              연락처를 남겨주시면 담당자가 인사드리고 예배와 새가족 안내를 도와드립니다. 등록은 의무가
              아닙니다.
            </p>
            <p className="mt-4 max-w-[36ch] text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
              수집된 정보는 새가족 안내와 연락 목적으로만 사용됩니다.
            </p>
          </div>
          <NewFamilyRegisterForm />
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-14 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
              Visit
            </p>
            <h2 className="mt-2 text-[28px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
              오시는 길과 안내
            </h2>
            <span aria-hidden className="mt-5 block h-px w-12" style={{ background: "var(--accent)" }} />
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/about" className={outlineCtaClass} style={outlineCtaStyle}>
                오시는 길 보기
              </Link>
              <Link href="/worship" className={outlineCtaClass} style={outlineCtaStyle}>
                예배안내 보기
              </Link>
            </div>
          </div>
          <dl className="border-t" style={{ borderColor: "var(--border)" }}>
            {visitInfoItems.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-1 gap-1 border-b py-4 sm:grid-cols-[130px_1fr] sm:gap-5"
                style={{ borderColor: "var(--border)" }}
              >
                <dt className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent-strong)" }}>
                  {item.label}
                </dt>
                <dd className="text-[14.5px] leading-[26px]" style={{ color: "var(--foreground)" }}>
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
        </div>
      </section>

      <section className="px-6 pb-24" style={{ background: "var(--surface)" }}>
        <div className="mx-auto max-w-[820px]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            FAQ
          </p>
          <h2 className="mt-2 mb-6 text-[28px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
            자주 묻는 질문
          </h2>
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            {faqItems.map((item) => (
              <details key={item.question} className="group border-b" style={{ borderColor: "var(--border)" }}>
                <summary
                  className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] [&::-webkit-details-marker]:hidden"
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
                <p className="pb-5 text-[14.5px] leading-[28px]" style={{ color: "var(--foreground-muted)" }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center" style={{ background: "var(--banner-bg)" }}>
        <div className="mx-auto max-w-[640px]">
          <h2
            className="text-[26px] text-[#f6f3ea] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, textWrap: "balance" }}
          >
            처음 방문을 준비하고 계신가요?
          </h2>
          <p className="mx-auto mt-3.5 text-[14.5px] leading-[27px]" style={{ color: "rgba(246, 243, 234, 0.75)" }}>
            예배 시간과 오시는 길을 미리 확인해 보세요.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/worship"
              className="inline-flex min-h-12 items-center rounded-full bg-[#f6f3ea] px-8 py-3.5 text-[15px] font-medium text-[#1f2a44] transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              예배 안내 보기
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-12 items-center rounded-full border px-8 py-3.5 text-[15px] font-medium text-[#f6f3ea] transition-colors hover:bg-white/10"
              style={{ borderColor: "rgba(212, 176, 74, 0.6)" }}
            >
              오시는 길 보기
            </Link>
          </div>
          <p className="mt-7 text-[13px]" style={{ color: "rgba(246, 243, 234, 0.6)" }}>
            홈페이지 소식과 교제에 참여하고 싶으시다면{" "}
            <Link href="/signup" className="underline underline-offset-4 text-[#f6f3ea]">
              회원가입
            </Link>
            을 해보세요.
          </p>
        </div>
      </section>
    </>
  );
}
