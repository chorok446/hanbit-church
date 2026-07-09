"use client";

import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { extractYouTubeId } from "@/lib/youtube";
import { PageShell } from "@/components/page-shell";
import { StaffContentGuard } from "@/components/staff-content-guard";
import { PostAttachmentsEditor } from "@/components/post-attachments-editor";
import { PostComposeSubmitButton } from "@/components/post-compose-form";
import { RichTextEditor } from "@/components/rich-text-editor";
import { splitRichBodyHtml } from "@/lib/rich-body-html";
import { richTextPlainLength } from "@/lib/rich-text-length";
import { POST_MAX_TEXT_LENGTH, normalizePostTags, type PostAttachment } from "@/data/posts";
import {
  SERMON_SERVICE_LABELS,
  SERMON_SERVICE_TAGS,
  buildSermonBody,
  isParsableScripture,
  type SermonServiceType,
} from "@/data/sermons";

const SERVICE_OPTIONS: SermonServiceType[] = ["SUNDAY", "WEDNESDAY", "DAWN", "SPECIAL"];

/** 줄당 1개 입력(나눔 질문·기도 제목) → 항목 배열. */
function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^(?:\d+[.)]\s*|[-•·]\s*)/, "").trim())
    .filter(Boolean);
}

/**
 * 설교 전용 구조화 작성 폼 — 스태프(canManageContent)만 접근(StaffContentGuard).
 * 입력을 buildSermonBody(sermons.ts)로 조립해 category=SERMON 게시글로 등록한다.
 * 조립 형식은 parseSermonInfo/getSermonSections 파서와 왕복 호환된다.
 */
export function SermonWriteClient() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [serviceType, setServiceType] = useState<SermonServiceType>("SUNDAY");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [prayersText, setPrayersText] = useState("");
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 요약은 리치 에디터(HTML) — 본문에 넣기 전에 인라인 이미지는 images 배열로 분리한다.
  const { html: summaryHtml, images: summaryImages } = useMemo(
    () => splitRichBodyHtml(summary.trim()),
    [summary],
  );

  const body = useMemo(
    () =>
      buildSermonBody({
        title,
        scripture,
        serviceType,
        youtubeUrl,
        summary: summaryHtml,
        questions: splitLines(questionsText),
        prayers: splitLines(prayersText),
      }),
    [title, scripture, serviceType, youtubeUrl, summaryHtml, questionsText, prayersText],
  );

  const scriptureTrimmed = scripture.trim();
  const scriptureUnparsable = scriptureTrimmed.length > 0 && !isParsableScripture(scriptureTrimmed);
  const youtubeTrimmed = youtubeUrl.trim();
  const youtubeInvalid = youtubeTrimmed.length > 0 && !extractYouTubeId(youtubeTrimmed);
  const summaryEmpty = richTextPlainLength(summaryHtml) === 0 && summaryImages.length === 0;
  // 서버(normalizePostText)와 동일하게 태그를 뺀 plain 길이 기준.
  const bodyPlainLength = richTextPlainLength(body);
  const overLength = bodyPlainLength > POST_MAX_TEXT_LENGTH;

  const submit = async () => {
    if (submittingRef.current) return;

    if (!title.trim()) {
      toast.error("설교 제목을 입력해주세요.");
      return;
    }
    if (summaryEmpty) {
      toast.error("말씀 요약을 입력해주세요.");
      return;
    }
    if (youtubeInvalid) {
      toast.error("유튜브 링크를 확인해주세요. (youtube.com / youtu.be 주소)");
      return;
    }
    if (overLength) {
      toast.error(`전체 내용이 ${POST_MAX_TEXT_LENGTH}자를 넘습니다. 요약이나 질문을 줄여주세요.`);
      return;
    }

    const requestToken = getSessionId();
    if (!requestToken) {
      toast.error("로그인 후 작성할 수 있어요.");
      router.push("/login?next=/sermons/write");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await apiPost("/api/posts", {
        text: body,
        images: summaryImages,
        tags: normalizePostTags(["#설교", SERMON_SERVICE_TAGS[serviceType]]),
        eventId: null,
        category: "SERMON",
        // 설교도 STAFF_WRITE 카테고리라 첨부(악보·자료 PDF) 허용 — 서버 normalizeAttachments 와 동일.
        attachments,
      });
      if (getSessionId() !== requestToken) return;
      toast.success("설교가 등록되었습니다.");
      router.push("/sermons");
    } catch (error) {
      if (getSessionId() !== requestToken) return;
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        toast.error("로그인 후 작성할 수 있어요.");
        router.push("/login?next=/sermons/write");
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error("설교 등록 권한이 없습니다.");
      } else {
        toast.error("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const labelClass = "mb-2 block text-[12px] tracking-[0.2em] uppercase";
  const labelStyle = { color: "var(--foreground-muted)" } as const;
  const controlStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  } as const;
  const hintClass = "mt-1.5 text-[12px]";

  return (
    <StaffContentGuard next="/sermons/write">
      <PageShell paddingClassName="relative min-h-screen overflow-hidden px-6 pt-28 pb-20" orb="right">
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-3 tracking-[0.4em] uppercase" style={{ color: "var(--accent-secondary)", fontSize: 11 }}>
              Sermons
            </p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(32px, 4vw, 52px)", color: "var(--foreground)" }}>
              설교 등록
            </h1>
            <p className="mt-3 text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
              입력한 내용은 설교 페이지에서 영상·말씀 요약·나눔 질문으로 정리되어 보여집니다.
            </p>
          </div>

          <div
            className="space-y-6 rounded-3xl border p-5 sm:p-8"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div>
              <label htmlFor="sermon-title" className={labelClass} style={labelStyle}>
                설교 제목 <span className="normal-case tracking-normal opacity-70">(필수)</span>
              </label>
              <input
                id="sermon-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                placeholder="항상 기뻐하라"
                className="ui-control w-full rounded-xl px-3 py-2.5 text-[14px] placeholder:opacity-50"
                style={controlStyle}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="sermon-scripture" className={labelClass} style={labelStyle}>
                  성경 본문
                </label>
                <input
                  id="sermon-scripture"
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value)}
                  maxLength={40}
                  placeholder="데살로니가전서 5:16-18"
                  aria-invalid={scriptureUnparsable}
                  className="ui-control w-full rounded-xl px-3 py-2.5 text-[14px] placeholder:opacity-50"
                  style={controlStyle}
                />
                {scriptureUnparsable ? (
                  <p className={hintClass} style={{ color: "var(--danger)" }} role="alert">
                    &ldquo;책이름 장:절&rdquo; 형식으로 적어주세요. (예: 시편 23편, 요한복음 3:16)
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="sermon-service" className={labelClass} style={labelStyle}>
                  예배 구분
                </label>
                <select
                  id="sermon-service"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as SermonServiceType)}
                  className="ui-control w-full px-3 py-2.5"
                  style={controlStyle}
                >
                  {SERVICE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {SERMON_SERVICE_LABELS[value]}
                    </option>
                  ))}
                </select>
                <p className={`${hintClass} opacity-60`} style={{ color: "var(--foreground)" }}>
                  {SERMON_SERVICE_TAGS[serviceType]} 태그로 목록 필터에 반영됩니다.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="sermon-youtube" className={labelClass} style={labelStyle}>
                유튜브 URL <span className="normal-case tracking-normal opacity-70">(선택)</span>
              </label>
              <input
                id="sermon-youtube"
                type="url"
                inputMode="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                aria-invalid={youtubeInvalid}
                className="ui-control w-full rounded-xl px-3 py-2.5 text-[14px] placeholder:opacity-50"
                style={controlStyle}
              />
              {youtubeInvalid ? (
                <p className={hintClass} style={{ color: "var(--danger)" }} role="alert">
                  youtube.com 또는 youtu.be 영상 주소를 입력해주세요.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="sermon-summary" className={labelClass} style={labelStyle}>
                말씀 요약 <span className="normal-case tracking-normal opacity-70">(필수)</span>
              </label>
              <RichTextEditor
                id="sermon-summary"
                value={summary}
                onChange={setSummary}
                placeholder="이번 말씀의 핵심을 성도들이 다시 새길 수 있도록 요약해주세요."
                required
                maxLength={POST_MAX_TEXT_LENGTH}
              />
            </div>

            <div>
              <label htmlFor="sermon-questions" className={labelClass} style={labelStyle}>
                나눔 질문 <span className="normal-case tracking-normal opacity-70">(선택, 줄당 1개)</span>
              </label>
              <textarea
                id="sermon-questions"
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                rows={3}
                placeholder={"오늘 말씀 중 가장 마음에 와닿은 구절은 무엇이었나요?\n한 주간 실천할 한 가지는 무엇인가요?"}
                className="ui-control w-full rounded-xl px-3 py-2.5 text-[14px] leading-relaxed placeholder:opacity-50"
                style={controlStyle}
              />
            </div>

            <div>
              <label htmlFor="sermon-prayers" className={labelClass} style={labelStyle}>
                기도 제목 <span className="normal-case tracking-normal opacity-70">(선택, 줄당 1개)</span>
              </label>
              <textarea
                id="sermon-prayers"
                value={prayersText}
                onChange={(e) => setPrayersText(e.target.value)}
                rows={3}
                placeholder={"들은 말씀대로 살아가는 한 주가 되게 하소서.\n교회와 성도들의 믿음이 굳건해지게 하소서."}
                className="ui-control w-full rounded-xl px-3 py-2.5 text-[14px] leading-relaxed placeholder:opacity-50"
                style={controlStyle}
              />
            </div>

            <PostAttachmentsEditor attachments={attachments} onChange={setAttachments} disabled={submitting} />

            <div>
              <p className={labelClass} style={labelStyle}>
                본문 미리보기 <span className="normal-case tracking-normal opacity-70">(자동 생성)</span>
              </p>
              <pre
                aria-label="등록될 본문 미리보기"
                className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border px-3.5 py-3 text-[12.5px] leading-relaxed"
                style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--foreground-muted)" }}
              >
                {body || "제목과 요약을 입력하면 본문이 여기에 만들어집니다."}
              </pre>
              <p
                className={hintClass}
                style={{ color: overLength ? "var(--danger)" : "var(--foreground-muted)" }}
                aria-live="polite"
              >
                {bodyPlainLength.toLocaleString()} / {POST_MAX_TEXT_LENGTH.toLocaleString()}자
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/sermons")}
                className="flex-1 rounded-xl py-3"
                style={{ background: "var(--border)", color: "var(--foreground)" }}
              >
                취소
              </button>
              <PostComposeSubmitButton
                submitting={submitting}
                disabled={!title.trim() || summaryEmpty || overLength}
                onClick={submit}
                idleLabel="설교 등록"
                pendingLabel="등록 중…"
              />
            </div>
          </div>
        </div>
      </PageShell>
    </StaffContentGuard>
  );
}
