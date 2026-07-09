"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, ExternalLink, Eye, Share2 } from "lucide-react";
import { PostAttachments } from "@/components/post-attachments";
import { PostText } from "@/components/post-text";
import { TagLink } from "@/components/tag-link";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { sharePage } from "@/lib/share";
import { isRichHtml } from "@/lib/sanitize-rich-html";
import { CHURCH } from "@/data/church";
import { getSermonSections, parseSermonInfo, sermonSummaryRichHtml, youTubeWatchUrl } from "@/data/sermons";
import type { Post } from "@/data/posts";

/** 상세 하단 섹션 제목 — 골드 구분선 한 줄 + 명조 제목(+ 샘플 배지). */
function SectionHeading({ label, sample }: { label: string; sample?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-px w-6" style={{ background: "var(--accent)" }} aria-hidden />
      <h3 className="text-[17px] sm:text-[18px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
        {label}
      </h3>
      {sample ? (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "var(--badge-muted-bg)", color: "var(--foreground-muted)" }}
        >
          예시
        </span>
      ) : null}
    </div>
  );
}

/**
 * SERMON 카테고리 전용 상세 레이아웃 — 좌측 큰 영상, 우측 설교 정보,
 * 하단 말씀 요약(#summary)·성경 본문(#scripture)·나눔 질문(#questions)·기도 제목(#prayers).
 * 설교는 좋아요·댓글(은혜 나눔)을 노출하지 않고 조회수만 보여준다.
 * 다른 카테고리는 기존 PostDetailHero 를 그대로 쓴다(post-detail-client 에서 분기).
 */
export function SermonDetail({
  post: p,
  bookmarked,
  bookmarking,
  refreshing,
  onBookmark,
}: {
  post: Post;
  bookmarked: boolean;
  bookmarking: boolean;
  refreshing: boolean;
  onBookmark: () => void;
}) {
  const info = parseSermonInfo(p);
  const sections = getSermonSections(p, info);
  const watchUrl = info.youtubeId ? youTubeWatchUrl(info.youtubeId) : null;
  const rich = isRichHtml(p.text);
  // 리치 본문은 머리말·나눔 질문/기도 제목 블록을 걷어낸 요약 부분만 PostText 로 렌더한다.
  const summaryHtml = rich ? sermonSummaryRichHtml(p.text) : "";

  const pillClass = "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium disabled:opacity-50";
  const pillStyle = { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" } as const;

  return (
    <div
      className="overflow-hidden rounded-3xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
        {/* 좌측 — 설교 영상 (없으면 안내 UI) */}
        <div className="p-5 sm:p-7">
          {info.youtubeId ? (
            <YouTubeEmbed videoId={info.youtubeId} title={`${info.title} 설교 영상`} />
          ) : (
            <div
              className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl px-6 text-center"
              style={{ background: "var(--banner-bg)", aspectRatio: "16 / 9" }}
            >
              <span aria-hidden style={{ color: "var(--accent)", fontSize: 22, lineHeight: 1 }}>✝</span>
              <p className="text-[16px] text-[#f6f3ea]" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                설교 영상 준비 중입니다.
              </p>
              <p className="text-[13px] text-[#f6f3ea] opacity-70">잠시 후 다시 확인해 주세요.</p>
              <Link
                href="/sermons"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12.5px] text-[#f6f3ea] transition-colors hover:bg-white/10"
                style={{ borderColor: "rgba(246, 243, 234, 0.35)" }}
              >
                <ArrowLeft size={12} aria-hidden /> 설교 목록으로 돌아가기
              </Link>
            </div>
          )}
        </div>

        {/* 우측 — 설교 정보(아바타 헤더 대신 제목이 먼저) */}
        <div className="flex flex-col gap-3 border-t p-5 sm:p-7 lg:border-l lg:border-t-0" style={{ borderColor: "var(--border)" }}>
          <span
            className="self-start rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em]"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            {info.serviceLabel}
          </span>
          <h2
            className="text-[25px] leading-snug sm:text-[28px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            {info.title}
          </h2>
          {info.scripture ? (
            <p className="text-[16px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>
              {info.scripture}
            </p>
          ) : null}
          <div className="space-y-0.5">
            <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              {info.date} · {CHURCH.name}
            </p>
            <p className="text-[13.5px]" style={{ color: "var(--foreground)" }}>
              설교자: {info.preacher}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={() => void sharePage({ title: info.title })} className={pillClass} style={pillStyle}>
              <Share2 size={13} aria-hidden /> 공유하기
            </button>
            <button
              type="button"
              onClick={onBookmark}
              disabled={bookmarking || refreshing}
              aria-pressed={bookmarked}
              className={pillClass}
              style={
                bookmarked
                  ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                  : pillStyle
              }
            >
              <Bookmark size={13} aria-hidden fill={bookmarked ? "currentColor" : "transparent"} /> 북마크
            </button>
            {watchUrl ? (
              <a href={watchUrl} target="_blank" rel="noopener noreferrer" className={pillClass} style={pillStyle}>
                <ExternalLink size={13} aria-hidden /> YouTube에서 보기
              </a>
            ) : null}
          </div>

          {/* 조회수 — 시각 우선순위 낮게 */}
          <div className="flex items-center gap-4 text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
            <span className="flex items-center gap-1.5">
              <Eye size={13} aria-hidden /> 조회 {p.views ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 하단 — 말씀 요약 / 성경 본문 / 나눔 질문 / 기도 제목 */}
      <div className="space-y-10 border-t p-6 sm:p-8" style={{ borderColor: "var(--border)" }}>
        <section id="summary" aria-label="말씀 요약" className="scroll-mt-28">
          <SectionHeading label="말씀 요약" sample={!rich && sections.summary.sample} />
          {rich ? (
            <PostText text={summaryHtml} style={{ color: "var(--foreground)", lineHeight: 1.8 }} />
          ) : (
            <p className="text-[15px] leading-8" style={{ color: "var(--foreground)" }}>
              {sections.summary.text}
            </p>
          )}
        </section>

        <section id="scripture" aria-label="성경 본문" className="scroll-mt-28">
          <SectionHeading label="성경 본문" />
          {info.scripture ? (
            <blockquote className="border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
              <p className="text-[18px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
                {info.scripture}
              </p>
              <p className="mt-1.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                본문 말씀 전체는 설교 영상에서 함께 들으실 수 있습니다.
              </p>
            </blockquote>
          ) : (
            <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              성경 본문 정보가 아직 등록되지 않았습니다.
            </p>
          )}
        </section>

        <section id="questions" aria-label="나눔 질문" className="scroll-mt-28">
          <SectionHeading label="나눔 질문" sample={sections.questions.sample} />
          <ol className="space-y-3.5">
            {sections.questions.items.map((question, index) => (
              <li key={index} className="flex gap-3.5">
                <span
                  className="w-6 shrink-0 pt-0.5 text-right text-[13px] tabular-nums"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--accent-strong)" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] leading-8" style={{ color: "var(--foreground)" }}>
                  {question}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="prayers" aria-label="기도 제목" className="scroll-mt-28">
          <SectionHeading label="기도 제목" sample={sections.prayers.sample} />
          <ul className="space-y-3">
            {sections.prayers.items.map((prayer, index) => (
              <li key={index} className="flex gap-3.5">
                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
                <p className="text-[15px] leading-8" style={{ color: "var(--foreground)" }}>
                  {prayer}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <PostAttachments attachments={p.attachments} />

        {p.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <TagLink
                key={t}
                tag={t}
                className="rounded-full px-2.5 py-0.5 text-[12px] transition-opacity hover:opacity-75"
                style={{ background: "var(--accent-soft)", color: "var(--accent-secondary)" }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
