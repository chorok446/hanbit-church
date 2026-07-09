import Link from "next/link";
import { CHURCH } from "@/data/church";

/** 페이지 마무리 CTA — 풀블리드 네이비 밴드(--banner-bg), 크림 텍스트(배너 관례 #f6f3ea). */
export function VisitCtaSection() {
  return (
    <section className="px-6 py-24 text-center" style={{ background: "var(--banner-bg)" }}>
      <div className="mx-auto max-w-[640px]">
        <h2
          className="text-[26px] text-[#f6f3ea] sm:text-[30px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, textWrap: "balance" }}
        >
          처음 방문하시나요?
        </h2>
        <p className="mx-auto mt-3.5 max-w-[38ch] text-[14.5px] leading-[27px]" style={{ color: "rgba(246, 243, 234, 0.75)" }}>
          {CHURCH.name}는 처음 오시는 한 분 한 분을 기쁨으로 환영합니다. 예배 시간과 새가족 안내를
          먼저 살펴보세요.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/worship"
            className="rounded-full bg-[#f6f3ea] px-7 py-3 text-[14px] font-medium text-[#1f2a44] transition-opacity hover:opacity-90"
          >
            예배안내 보기
          </Link>
          <Link
            href="/welcome"
            className="rounded-full border px-7 py-3 text-[14px] font-medium text-[#f6f3ea] transition-colors hover:bg-white/10"
            style={{ borderColor: "rgba(212, 176, 74, 0.6)" }}
          >
            새가족 안내 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
