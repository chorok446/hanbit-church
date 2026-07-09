import { BookOpen, Church, HeartHandshake, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const VISION_ITEMS: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "예배", icon: Church, body: "하나님을 삶의 중심에 모시고, 온 세대가 함께 예배합니다." },
  { title: "말씀", icon: BookOpen, body: "성경 말씀을 배우고 삶의 자리에서 순종하도록 돕습니다." },
  { title: "교제", icon: Users, body: "서로의 삶을 돌보고 기도하며 믿음의 가족으로 함께 걷습니다." },
  { title: "섬김", icon: HeartHandshake, body: "지역과 이웃을 향해 복음의 사랑을 실천합니다." },
];

/** 우리 교회의 비전 — 예배·말씀·교제·섬김 4카드 (모바일 1열, 데스크톱 2열). */
export function VisionSection() {
  return (
    <>
      <h2
        className="mt-16 text-[22px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        우리 교회의 비전
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {VISION_ITEMS.map((item, index) => (
          <li
            key={item.title}
            className="rounded-2xl border p-7"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                {String(index + 1).padStart(2, "0")}
              </p>
              <item.icon size={18} aria-hidden style={{ color: "var(--accent)" }} />
            </div>
            <h3
              className="mt-2 text-[19px]"
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
