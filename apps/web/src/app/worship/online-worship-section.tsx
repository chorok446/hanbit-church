import { MonitorPlay } from "lucide-react";
import { CHURCH_LINKS } from "@/data/church";

/** 온라인 예배 — 유튜브 채널이 설정돼 있으면 바로가기, 없으면 준비 중 안내. */
export function OnlineWorshipSection() {
  const youtube = CHURCH_LINKS.youtube;

  return (
    <div
      className="rounded-2xl border px-7 py-8 sm:px-8"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2.5">
        <MonitorPlay size={19} aria-hidden style={{ color: "var(--accent)" }} />
        <h2
          className="text-[22px] sm:text-[24px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          온라인 예배
        </h2>
      </div>
      {youtube ? (
        <>
          <p className="mt-4 max-w-[52ch] text-[14.5px] leading-8" style={{ color: "var(--foreground-muted)" }}>
            현장에 오시기 어려운 분은 유튜브 채널에서 예배 실황과 설교 다시보기를 시청하실 수
            있습니다.
          </p>
          <a
            href={youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3 text-[14px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          >
            온라인 예배 바로가기
          </a>
        </>
      ) : (
        <p className="mt-4 max-w-[52ch] text-[14.5px] leading-8" style={{ color: "var(--foreground-muted)" }}>
          온라인 예배 안내는 준비 중입니다. 현장 예배는 누구나 참석하실 수 있습니다.
        </p>
      )}
    </div>
  );
}
