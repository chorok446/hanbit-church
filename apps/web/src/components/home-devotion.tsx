import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { devotionDateLabel, type Devotion } from "@/data/devotion";

/**
 * 홈 "오늘의 말씀" 카드 — 데일리 큐티(본문 + 묵상 발췌). 매일 갱신되어 재방문 동기를 만든다.
 * initialDevotion 은 서버(ISR)가 선주입한다. 없으면(등록 전·API 미가용) 섹션을 렌더하지 않는다.
 */
export function HomeDevotion({ devotion }: { devotion: Devotion | null }) {
  if (!devotion) return null;
  const excerpt =
    devotion.meditation.length > 140 ? `${devotion.meditation.slice(0, 140)}…` : devotion.meditation;
  return (
    <section className="px-6 pt-20 pb-10" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/devotion/${devotion.id}`}
          className="card-lift block overflow-hidden rounded-3xl border p-8 sm:p-10"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-[12px] font-semibold"
              style={{ color: "var(--accent-strong)" }}
            >
              오늘의 말씀
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
              {devotionDateLabel(devotion.date)}
            </p>
          </div>

          <blockquote className="mt-6 m-0">
            <p
              className="text-[22px] leading-[1.6] sm:text-[26px]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--heading)",
                wordBreak: "keep-all",
                textWrap: "balance",
              }}
            >
              “{devotion.verseText}”
            </p>
            <cite
              className="mt-3 block text-[13.5px] not-italic"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              <span aria-hidden style={{ color: "var(--accent)" }}>
                —{" "}
              </span>
              {devotion.verseRef}
            </cite>
          </blockquote>

          <p className="mt-6 text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
            {excerpt}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: "var(--accent-strong)" }}
            >
              묵상 전체 보기 <ArrowRight size={14} aria-hidden />
            </span>
            {devotion.comments > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 text-[12.5px]"
                style={{ color: "var(--foreground-muted)" }}
              >
                <MessageCircle size={13} aria-hidden /> 은혜나눔 {devotion.comments}
              </span>
            ) : null}
          </div>
        </Link>
      </div>
    </section>
  );
}
