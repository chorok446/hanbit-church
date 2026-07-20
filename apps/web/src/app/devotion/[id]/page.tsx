import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGetOrNull } from "@/lib/api";
import { CHURCH } from "@/data/church";
import { devotionDateLabel, type Devotion } from "@/data/devotion";
import { DevotionComments } from "./devotion-comments";
import { DevotionStaffActions } from "./devotion-staff-actions";

// generateMetadata 와 본문이 같은 요청에서 fetch 를 공유하도록 dedupe.
const getDevotion = cache((id: string) => apiGetOrNull<Devotion>(`/api/devotions/${id}`));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const devotion = await getDevotion(id);
  if (!devotion) return {};
  const title = `${devotionDateLabel(devotion.date)} 큐티`;
  const description = `${devotion.verseRef} — ${devotion.verseText}`;
  return { title, description, openGraph: { title, description } };
}

export default async function DevotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const devotion = await getDevotion(id);
  if (!devotion) notFound();

  return (
    <article className="px-6 pb-24 pt-32" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/devotion"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: "var(--foreground-muted)" }}
        >
          <ArrowLeft size={14} aria-hidden /> 큐티 목록
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
              오늘의 말씀
            </p>
            <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              {devotionDateLabel(devotion.date)}
            </p>
          </div>

          <blockquote className="mt-6 m-0">
            <p
              className="text-[24px] leading-[1.6] sm:text-[30px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", wordBreak: "keep-all", textWrap: "balance" }}
            >
              “{devotion.verseText}”
            </p>
            <cite
              className="mt-3 block text-[15px] not-italic"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}
            >
              <span aria-hidden style={{ color: "var(--accent)" }}>— </span>
              {devotion.verseRef}
            </cite>
          </blockquote>
        </header>

        {/* 묵상 본문 — 명조로 편안한 읽기. 줄바꿈 보존. */}
        <div
          className="mt-8 whitespace-pre-wrap text-[16px] leading-[1.9]"
          style={{ fontFamily: "var(--font-display)", color: "var(--foreground)", wordBreak: "keep-all" }}
        >
          {devotion.meditation}
        </div>

        <p className="mt-8 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          {devotion.authorName} · {CHURCH.name}
        </p>

        <DevotionStaffActions id={devotion.id} />

        <hr className="my-10 border-t" style={{ borderColor: "var(--border)" }} />

        <DevotionComments devotionId={devotion.id} initialCount={devotion.comments} />
      </div>
    </article>
  );
}
