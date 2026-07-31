const VISION_ITEMS: Array<{ title: string; body: string }> = [
  { title: "예배", body: "하나님을 삶의 중심에 모시고, 온 세대가 함께 예배합니다." },
  { title: "말씀", body: "성경 말씀을 배우고 삶의 자리에서 순종하도록 돕습니다." },
  { title: "교제", body: "서로의 삶을 돌보고 기도하며 믿음의 가족으로 함께 걷습니다." },
  { title: "섬김", body: "지역과 이웃을 향해 복음의 사랑을 실천합니다." },
];

/** 우리 교회의 비전 — 웜크림 밴드, 상단 구분선 + 명조 제목의 4열(반응형).
 *  4가치는 순서 개념이 없어 번호(01~04)를 붙이지 않는다 — 번호 시퀀스는 /welcome 방문 여정처럼 실제 순서가 있을 때만. */
export function VisionSection() {
  return (
    <section className="px-6 py-24" style={{ background: "var(--surface-muted)" }}>
      <div className="mx-auto max-w-5xl">
        <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
        <h2
          className="mt-2 text-[28px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          우리 교회의 비전
        </h2>
        <ul className="mt-11 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {VISION_ITEMS.map((item) => (
            <li key={item.title} className="border-t pt-5" style={{ borderColor: "rgba(var(--ink-rgb), 0.25)" }}>
              <h3
                className="text-[21px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[25px]" style={{ color: "var(--foreground-muted)" }}>
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
