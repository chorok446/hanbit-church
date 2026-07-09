import { CHURCH } from "@/data/church";

// TODO(교회 확인): 실제 연혁(설립 연도·주요 사건)으로 교체 — 확인 전까지는 연대를 단정하지 않는다
const HISTORY_ITEMS = [
  {
    era: "시작",
    title: "예배 공동체의 시작",
    body: "철마 지역에서 함께 모여 예배하는 공동체로 시작했습니다.",
  },
  {
    era: "성장",
    title: "섬김의 확장",
    body: "말씀과 교제를 중심으로 지역과 다음세대를 섬기는 사역을 이어왔습니다.",
  },
  {
    era: "오늘",
    title: `오늘의 ${CHURCH.name}`,
    body: "예배·말씀·교제·섬김을 중심으로 함께 세워져 가는 공동체입니다.",
  },
];

/** 교회 발자취 — 세로 타임라인 카드. */
export function HistorySection() {
  return (
    <>
      <h2
        className="mt-16 text-[22px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        교회 발자취
      </h2>
      <div
        className="mt-6 rounded-3xl border p-8 sm:p-10"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <ol>
          {HISTORY_ITEMS.map((item, index) => (
            <li key={item.era} className="relative pb-8 pl-7 last:pb-0">
              {index < HISTORY_ITEMS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[4px] top-4 h-full w-px"
                  style={{ background: "var(--border)" }}
                />
              )}
              <span
                aria-hidden
                className="absolute left-0 top-2 h-[9px] w-[9px] rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
                {item.era}
              </p>
              <h3
                className="mt-1.5 text-[17px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {item.title}
              </h3>
              <p className="mt-1 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
