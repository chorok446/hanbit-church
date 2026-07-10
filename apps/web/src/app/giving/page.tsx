import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { GivingAccountCard } from "./giving-account-card";

export const metadata: Metadata = {
  title: "헌금 안내",
  description: `${CHURCH.name} 헌금 안내 — 헌금의 의미, 종류, 계좌 안내`,
};

// TODO(교회 확인): 헌금 종류·명칭은 교회 관례에 맞게 확정한다. 아래는 일반적인 구성의 자리표시다.
const GIVING_KINDS: Array<{ name: string; body: string }> = [
  { name: "주정 헌금", body: "주일 예배에서 드리는 헌금입니다. 예배 중 헌금 시간에 참여하실 수 있습니다." },
  { name: "십일조", body: "소득의 십분의 일을 하나님께 드리는 헌금입니다." },
  { name: "감사 헌금", body: "삶에서 누린 은혜에 감사하며 드리는 헌금입니다." },
  { name: "선교 헌금", body: "국내외 선교사와 선교지 후원을 위해 쓰입니다." },
  { name: "절기 헌금", body: "부활절·추수감사절·성탄절 등 절기에 드리는 헌금입니다." },
];

export default function GivingPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Giving
        </p>
        <h1
          className="mt-2 text-[30px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", wordBreak: "keep-all" }}
        >
          헌금 안내
        </h1>
        <p className="mt-4 max-w-[58ch] text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          헌금은 하나님께서 베풀어 주신 은혜에 대한 감사의 고백입니다. 모든 헌금은 예배와 교육,
          지역 섬김과 선교를 위해 투명하게 사용됩니다.
        </p>

        <blockquote
          className="mt-10 border-l-2 py-1 pl-5 text-[16px] leading-8"
          style={{ borderColor: "var(--accent)", fontFamily: "var(--font-display)", color: "var(--heading)" }}
        >
          &ldquo;각각 그 마음에 정한 대로 할 것이요 인색함으로나 억지로 하지 말지니
          하나님은 즐겨 내는 자를 사랑하시느니라&rdquo;
          <cite className="mt-2 block text-[13px] not-italic" style={{ color: "var(--foreground-muted)" }}>
            — 고린도후서 9:7
          </cite>
        </blockquote>

        <section className="mt-12" aria-label="헌금 종류">
          <h2
            className="text-[19px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            헌금의 종류
          </h2>
          <ul className="mt-4 space-y-0">
            {GIVING_KINDS.map((kind) => (
              <li
                key={kind.name}
                className="flex flex-col gap-1 border-t py-4 sm:flex-row sm:gap-6"
                style={{ borderColor: "rgba(var(--ink-rgb), 0.25)" }}
              >
                <span className="w-24 shrink-0 text-[14.5px] font-semibold" style={{ color: "var(--heading)" }}>
                  {kind.name}
                </span>
                <span className="text-[14px] leading-[26px]" style={{ color: "var(--foreground-muted)" }}>
                  {kind.body}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-label="온라인 헌금 계좌">
          <h2
            className="text-[19px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            온라인 헌금 계좌
          </h2>
          <GivingAccountCard />
          <p className="mt-3 text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
            이체 시 <b style={{ color: "var(--foreground)" }}>이름과 헌금 종류</b>(예: 홍길동 십일조)를 적어주시면
            정확하게 처리됩니다. 헌금 내역 관련 문의는 교회 사무실({CHURCH.phone})로 연락해 주세요.
          </p>
        </section>
      </div>
    </section>
  );
}
