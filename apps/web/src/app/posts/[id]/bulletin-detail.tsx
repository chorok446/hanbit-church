"use client";

import { Bookmark, Eye, Share2 } from "lucide-react";
import { PdfViewer } from "@/components/pdf-viewer";
import { PostAttachments } from "@/components/post-attachments";
import { TagLink } from "@/components/tag-link";
import { sharePage } from "@/lib/share";
import { CHURCH } from "@/data/church";
import { bulletinPdfAttachments, bulletinTitle, isPdfAttachment } from "@/data/bulletins";
import { postTimeLabel, type Post } from "@/data/posts";

/**
 * BULLETIN 카테고리 전용 상세 — 주보 PDF 를 다운로드 링크가 아닌 페이지 안에서 바로 열어본다.
 * 설교(SermonDetail)와 동일한 관례: 상단 카드(제목·날짜·공유/북마크) + 본문 자리에 인라인 뷰어.
 * 좋아요는 공식 소식이라 노출하지 않고 조회수만 보여준다(post-detail-client 에서 분기).
 */
export function BulletinDetail({
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
  const title = bulletinTitle(p);
  const pdfs = bulletinPdfAttachments(p);
  // PDF 외 첨부(드묾)는 기존 다운로드 링크 목록으로.
  const otherAttachments = (p.attachments ?? []).filter((att) => !isPdfAttachment(att));

  const pillClass = "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium disabled:opacity-50";
  const pillStyle = { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" } as const;

  return (
    <div className="overflow-hidden rounded-3xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex flex-col gap-3 p-6 sm:p-8">
        <span
          className="self-start rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em]"
          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
        >
          주보
        </span>
        <h2
          className="text-[25px] leading-snug sm:text-[28px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          {title}
        </h2>
        <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          {postTimeLabel(p)} · {CHURCH.name}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => void sharePage({ title })} className={`${pillClass} cta-outline`}>
            <Share2 size={13} aria-hidden /> 공유하기
          </button>
          <button
            type="button"
            onClick={onBookmark}
            disabled={bookmarking || refreshing}
            aria-pressed={bookmarked}
            className={pillClass}
            style={bookmarked ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" } : pillStyle}
          >
            <Bookmark size={13} aria-hidden fill={bookmarked ? "currentColor" : "transparent"} /> 북마크
          </button>
          <span className="ml-auto flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
            <Eye size={13} aria-hidden /> 조회 {p.views ?? 0}
          </span>
        </div>
      </div>

      {/* 인라인 뷰어 — 주보 PDF 를 페이지 안에서 바로 표시 */}
      <div className="space-y-4 border-t p-4 sm:p-6" style={{ borderColor: "var(--border)" }}>
        {pdfs.length > 0 ? (
          pdfs.map((att) => <PdfViewer key={att.url} url={att.url} name={att.name} size={att.size} />)
        ) : (
          <p className="py-10 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            등록된 주보 파일이 없습니다.
          </p>
        )}

        {otherAttachments.length > 0 ? <PostAttachments attachments={otherAttachments} /> : null}

        {p.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
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
