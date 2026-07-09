import { CHURCH } from "@/data/church";

// TODO(교회 확인): 실제 연혁(설립 연도·주요 사건)으로 교체 — 확인 전까지는 연대를 단정하지 않는다
const HISTORY_ITEMS = [
  { era: "시작", title: "예배 공동체의 시작", body: "한빛 지역에서 함께 모여 예배하는 공동체로 시작했습니다." },
  { era: "성장", title: "섬김의 확장", body: "말씀과 교제를 중심으로 지역과 다음세대를 섬기는 사역을 이어왔습니다." },
  { era: "오늘", title: `오늘의 ${CHURCH.name}`, body: "예배·말씀·교제·섬김을 중심으로 함께 세워져 가는 공동체입니다." },
];

// TODO(교회 확인): 실제 부서·모임 명칭과 소개로 교체
const COMMUNITY_ITEMS = [
  { title: "예배 공동체", body: "주일 예배와 수요 예배, 새벽 기도회로 온 세대가 함께 하나님께 나아갑니다." },
  { title: "다음세대", body: "어린이와 청소년, 청년이 말씀 안에서 믿음으로 자라도록 돕습니다." },
  { title: "교제와 양육", body: "삶을 나누는 교제와 양육의 자리를 통해 서로를 세워 갑니다." },
  { title: "지역 섬김", body: "한빛 지역의 이웃을 돌보며 복음의 사랑을 실천합니다." },
];

/** 발자취(세로 타임라인) + 공동체(정의형 목록)를 크림 밴드에서 2열로 나란히 배치. */
export function HistoryCommunitySection() {
  return (
    <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 lg:grid-cols-[5fr_7fr] lg:gap-[72px]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            History
          </p>
          <h2
            className="mt-2 mb-8 text-[26px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            교회 발자취
          </h2>
          <ol>
            {HISTORY_ITEMS.map((item, index) => (
              <li key={item.era} className="relative pb-8 pl-7 last:pb-0">
                {index < HISTORY_ITEMS.length - 1 && (
                  <span aria-hidden className="absolute left-[4px] top-4 h-full w-px" style={{ background: "var(--border)" }} />
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
                <p className="mt-1 text-[14px] leading-[26px]" style={{ color: "var(--foreground-muted)" }}>
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            Community
          </p>
          <h2
            className="mt-2 mb-6 text-[26px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            함께하는 공동체
          </h2>
          <ul className="border-t" style={{ borderColor: "var(--border)" }}>
            {COMMUNITY_ITEMS.map((item) => (
              <li
                key={item.title}
                className="grid grid-cols-1 items-baseline gap-2 border-b py-5 sm:grid-cols-[140px_1fr] sm:gap-4"
                style={{ borderColor: "var(--border)" }}
              >
                <h3
                  className="text-[16.5px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  {item.title}
                </h3>
                <p className="text-[14px] leading-[26px]" style={{ color: "var(--foreground-muted)" }}>
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
