import { Baby, Clock, HandHeart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type GuideItem = {
  icon: LucideIcon;
  title: string;
  body: string;
};

// TODO(교회 확인): 예배 전 안내 문구는 예시 — 실제 안내 방식 확인 후 확정.
const BEFORE_WORSHIP_GUIDES: GuideItem[] = [
  {
    icon: Clock,
    title: "도착 시간",
    body: "예배 시작 10분 전까지 오시면 여유 있게 자리를 안내받으실 수 있습니다.",
  },
  {
    icon: HandHeart,
    title: "안내 데스크",
    body: "본당 입구 안내 데스크에서 주보와 좌석 안내를 도와드립니다.",
  },
  {
    icon: Baby,
    title: "아이와 함께",
    body: "아이와 함께 오셔도 괜찮습니다. 예배 중 필요한 도움은 안내 위원에게 말씀해 주세요.",
  },
];

/** 예배 전 안내 3카드 — 도착 시간 / 안내 데스크 / 아이와 함께. */
export function BeforeWorshipSection() {
  return (
    <div>
      <h2
        className="text-[22px] sm:text-[24px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        예배 전 안내
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BEFORE_WORSHIP_GUIDES.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="rounded-2xl border p-6"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <Icon size={20} aria-hidden style={{ color: "var(--accent)" }} />
            <h3 className="mt-3 text-[15.5px] font-semibold" style={{ color: "var(--heading)" }}>
              {title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
              {body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
