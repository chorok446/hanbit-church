// TODO(교회 확인): 실제 부서·모임 명칭과 소개로 교체
const COMMUNITY_ITEMS = [
  { title: "예배 공동체", body: "주일 예배와 수요 예배, 새벽 기도회로 온 세대가 함께 하나님께 나아갑니다." },
  { title: "다음세대", body: "어린이와 청소년, 청년이 말씀 안에서 믿음으로 자라도록 돕습니다." },
  { title: "교제와 양육", body: "삶을 나누는 교제와 양육의 자리를 통해 서로를 세워 갑니다." },
  { title: "지역 섬김", body: "한빛 지역의 이웃을 돌보며 복음의 사랑을 실천합니다." },
];

/** 함께하는 공동체 — 예배·다음세대·교제와 양육·지역 섬김 4카드. */
export function CommunitySection() {
  return (
    <>
      <h2
        className="mt-16 text-[22px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        함께하는 공동체
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COMMUNITY_ITEMS.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border p-6"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <h3
              className="text-[17px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              {item.title}
            </h3>
            <p className="mt-2 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
