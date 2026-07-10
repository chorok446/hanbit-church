import { BookOpen, Globe, HeartHandshake, Sprout } from "lucide-react";

// TODO(교회 확인): 정체성 키워드와 설명 문구는 자리표시입니다 — 교회가 실제로 쓰는 표현으로 교체해 주세요.
const VALUES = [
  { icon: BookOpen, title: "복음 중심", body: "말씀과 기도로 세워지는 예배 공동체를 지향합니다." },
  { icon: Sprout, title: "다음세대", body: "어린이·청소년·청년이 믿음 안에서 자라도록 돕습니다." },
  { icon: HeartHandshake, title: "지역사회", body: "우리 지역의 이웃과 함께 걷고 함께 섬기는 교회입니다." },
  { icon: Globe, title: "선교", body: "국내외 선교지와 동역하며 복음의 지경을 넓혀 갑니다." },
] as const;

/** 교회 정체성 키워드 4가지 — 복음 중심 · 다음세대 · 지역사회 · 선교. */
export function HomeIdentity() {
  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            Our Church
          </p>
          <h2
            className="text-[26px] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            우리 교회가 소중히 여기는 것
          </h2>
          <div aria-hidden className="mx-auto mt-5 h-px w-12" style={{ background: "var(--accent)" }} />
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border p-6 text-center"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <span
                className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "var(--accent-soft)" }}
              >
                <Icon size={19} aria-hidden style={{ color: "var(--accent-strong)" }} />
              </span>
              <h3
                className="mt-4 text-[18px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {title}
              </h3>
              <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
