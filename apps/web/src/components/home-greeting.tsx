import Link from "next/link";
import { CHURCH_GREETING } from "@/data/church";

/** 홈 중간 환대 인터루드 — 담임목사 인사(교회소개 인사말과 CHURCH_GREETING 공유).
 *  실사진 확보 전까지 스톡 사진 인터루드(git 히스토리 home-photos.tsx)를 대신한다.
 *  TODO(교회 확인): 실사진이 준비되면 사진 인터루드 복원 여부 결정. */
export function HomeGreeting() {
  return (
    <section className="px-6 pb-20" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-[680px] text-center">
        <span aria-hidden className="mx-auto mb-7 block h-px w-12" style={{ background: "var(--accent)" }} />
        <p
          className="mx-auto max-w-[24ch] text-[22px] leading-[1.7] sm:text-[26px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", textWrap: "balance" }}
        >
          {CHURCH_GREETING.lead}
        </p>
        <p className="mt-5 text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
          {CHURCH_GREETING.signature}
        </p>
        <Link
          href="/about"
          className="mt-4 inline-flex min-h-11 items-center text-[13.5px] underline underline-offset-4 transition-opacity hover:opacity-80"
          style={{ color: "var(--accent-strong)" }}
        >
          인사말 전문 보기
        </Link>
      </div>
    </section>
  );
}
