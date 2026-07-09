import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { CHURCH } from "@/data/church";

/** 오시는 길 + 새가족 환영 — 예배 다음, 소식·행사보다 위에 두는 핵심 안내. */
export function HomeVisit() {
  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="flex flex-col rounded-3xl border p-8 sm:p-10"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
            Visit
          </p>
          <h2
            className="text-[24px] sm:text-[28px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            오시는 길
          </h2>
          <div className="mt-5 space-y-2.5">
            <p className="flex items-start gap-2 text-[14px] leading-6" style={{ color: "var(--foreground)" }}>
              <MapPin size={15} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--accent)" }} />
              {CHURCH.address}
            </p>
            <p className="flex items-center gap-2 text-[14px]" style={{ color: "var(--foreground)" }}>
              <Phone size={15} aria-hidden className="shrink-0" style={{ color: "var(--accent)" }} />
              {CHURCH.phone}
            </p>
          </div>
          <Link
            href="/about"
            className="mt-auto inline-block pt-6 text-[13px] font-medium underline-offset-4 hover:underline"
            style={{ color: "var(--accent-strong)" }}
          >
            지도와 주차 안내 보기 →
          </Link>
        </div>

        <div
          className="flex flex-col items-center justify-center rounded-3xl border px-8 py-12 text-center sm:px-12"
          style={{ background: "var(--banner-bg)", borderColor: "var(--banner-border)" }}
        >
          <p
            className="mx-auto max-w-[24ch] text-[20px] leading-[1.6] text-[#f6f3ea] sm:text-[24px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, textWrap: "balance" }}
          >
            {CHURCH.name}에 처음 오셨나요?
          </p>
          <p className="mx-auto mt-3 max-w-[32ch] text-[14px] leading-7 text-[#f6f3ea]/75" style={{ textWrap: "balance" }}>
            예배 시간, 오시는 길, 새가족 안내를 한 번에 확인해보세요.
          </p>
          <Link
            href="/welcome"
            className="mt-7 inline-flex min-h-11 items-center rounded-full bg-[#f6f3ea] px-8 py-3 text-[14px] font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ color: "var(--banner-bg)" }}
          >
            새가족 안내 보기
          </Link>
          <div className="mt-4 flex items-center gap-4 text-[13px] text-[#f6f3ea]/70">
            <Link href="/worship" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-[#f6f3ea] hover:underline">
              예배안내
            </Link>
            <span aria-hidden className="h-3 w-px bg-[#f6f3ea]/25" />
            <Link href="/about" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-[#f6f3ea] hover:underline">
              오시는 길
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
