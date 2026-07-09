import Link from "next/link";
import { Car, MapPin, MonitorPlay, Phone } from "lucide-react";
import { CHURCH, CHURCH_LINKS } from "@/data/church";

/** 오시는 길·온라인 예배 — 크림 밴드, 2열(연락처·주차 안내 | 온라인 예배 카드). */
export function DirectionsOnlineSection() {
  const youtube = CHURCH_LINKS.youtube;

  return (
    <section className="px-6 pb-28 pt-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-14 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2
            className="text-[26px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            오시는 길과 주차
          </h2>
          <span aria-hidden className="mt-4 block h-px w-12" style={{ background: "var(--accent)" }} />
          <ul className="mt-7 space-y-4 text-[14.5px]" style={{ color: "var(--foreground)" }}>
            <li className="flex items-start gap-2.5">
              <MapPin size={15} aria-hidden className="mt-1.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="leading-7">{CHURCH.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Car size={15} aria-hidden className="mt-1.5 shrink-0" style={{ color: "var(--accent)" }} />
              {/* TODO(교회 확인): 주차 가능 대수·주차장 위치 확인 후 문구 확정 */}
              <span className="leading-7">
                교회 마당에 주차하실 수 있습니다. 주일에는 안내 위원이 주차를 도와드립니다.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={15} aria-hidden className="mt-1.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="leading-7">
                문의 전화{" "}
                <a href={`tel:${CHURCH.phone.replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">
                  {CHURCH.phone}
                </a>
              </span>
            </li>
          </ul>
          <Link
            href="/about"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border px-7 py-3 text-[14px] font-medium transition-colors hover:bg-[var(--panel)]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            오시는 길 보기
          </Link>
        </div>

        <div className="rounded-[20px] p-8" style={{ background: "var(--chip-bg)" }}>
          <div className="flex items-center gap-2.5">
            <MonitorPlay size={19} aria-hidden style={{ color: "var(--accent)" }} />
            <h2
              className="text-[21px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              온라인 예배
            </h2>
          </div>
          {youtube ? (
            <>
              <p className="mt-3.5 text-[14px] leading-[27px]" style={{ color: "var(--foreground-muted)" }}>
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
            <p className="mt-3.5 text-[14px] leading-[27px]" style={{ color: "var(--foreground-muted)" }}>
              온라인 예배 안내는 준비 중입니다. 현장 예배는 누구나 참석하실 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
