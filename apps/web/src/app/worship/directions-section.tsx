import Link from "next/link";
import { Car, MapPin, Phone } from "lucide-react";
import { CHURCH } from "@/data/church";

/** 오시는 길과 주차 — 지도 embed는 /about에 있으므로 요약 + 링크만. */
export function DirectionsSection() {
  return (
    <div
      className="rounded-2xl border px-7 py-8 sm:px-8"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <h2
        className="text-[22px] sm:text-[24px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        오시는 길과 주차
      </h2>
      <ul className="mt-5 space-y-3 text-[14.5px]" style={{ color: "var(--foreground)" }}>
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
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border px-7 py-3 text-[14px] font-medium transition-colors"
        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        오시는 길 보기
      </Link>
    </div>
  );
}
