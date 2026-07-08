import type { Metadata } from "next";
import { CHURCH } from "@/data/church";

export const metadata: Metadata = {
  title: "교회소개",
  description: `${CHURCH.name} 소개 — 인사말, 비전, 섬기는 사람들, 오시는 길`,
};

// TODO(교회 확인): 인사말·비전·섬기는 분들 실제 내용으로 교체
const VISION = [
  { title: "예배", body: "하나님께 신령과 진정으로 드리는 예배를 삶의 중심에 둡니다." },
  { title: "말씀", body: "말씀 위에 서서 배우고 순종하는 성도로 자라갑니다." },
  { title: "교제", body: "한 가족으로 서로 사랑하고 돌보며 함께 걸어갑니다." },
  { title: "섬김", body: "받은 은혜로 이웃과 지역을 섬기며 복음을 전합니다." },
];

export default function AboutPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          About
        </p>
        <h1
          className="text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          교회소개
        </h1>

        <div
          className="mt-10 rounded-3xl border p-8 sm:p-12"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2
            className="text-[22px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            인사말
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-8" style={{ color: "var(--foreground)" }}>
            <p>{CHURCH.name} 홈페이지를 찾아주신 여러분을 주님의 이름으로 환영합니다.</p>
            <p>
              우리 교회는 하나님을 예배하고, 말씀 안에서 자라며, 서로 사랑으로 교제하고, 지역과 이웃을
              섬기는 믿음의 공동체입니다. 이곳에서 하나님의 은혜와 위로를 함께 누리시길 바랍니다.
            </p>
            <p>
              처음 오시는 분도, 오랜 성도님도 언제나 환영합니다. 주님 안에서 만나 뵙기를 소망합니다.
            </p>
            {/* TODO(교회 확인): 담임목사 성함으로 교체 */}
            <p className="pt-2 text-right" style={{ color: "var(--foreground-muted)" }}>
              {CHURCH.name} 담임목사 드림
            </p>
          </div>
        </div>

        <h2
          className="mt-16 text-[22px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          우리 교회의 비전
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VISION.map((item, index) => (
            <li
              key={item.title}
              className="rounded-2xl border p-7"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-[11px] font-semibold tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                {String(index + 1).padStart(2, "0")}
              </p>
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

        <h2
          className="mt-16 text-[22px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          오시는 길
        </h2>
        <div
          className="mt-6 rounded-3xl border p-8"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="text-[15px]" style={{ color: "var(--foreground)" }}>{CHURCH.address}</p>
          <p className="mt-2 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            전화 {CHURCH.phone} · 이메일 {CHURCH.email}
          </p>
          {/* TODO(Phase 1 후속): 주소 확정 후 카카오맵 임베드 추가 */}
          <div
            className="mt-6 flex h-56 items-center justify-center rounded-2xl text-[13px]"
            style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
          >
            지도는 주소 확정 후 제공됩니다
          </div>
        </div>
      </div>
    </section>
  );
}
