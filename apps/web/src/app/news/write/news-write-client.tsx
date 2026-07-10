"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { StaffContentGuard } from "@/components/staff-content-guard";
import { PostAttachmentsEditor } from "@/components/post-attachments-editor";
import { PostComposeForm, PostComposeSubmitButton } from "@/components/post-compose-form";
import {
  postCategoryBadge,
  validatePostCompose,
  type PostAttachment,
  type PostCategory,
  type PostComposeField,
  type PostComposeValues,
} from "@/data/posts";

const EMPTY_VALUES: PostComposeValues = { text: "", images: [], tags: [], event: "" };

/** /news/write 에서 고를 수 있는 공식 소식 카테고리(뉴스 탭 순서와 동일). */
const WRITE_CATEGORIES: PostCategory[] = ["NOTICE", "BULLETIN"];

/**
 * 소식(공지·주보) 전용 작성 페이지 — 스태프(canManageContent)만 접근(StaffContentGuard).
 * 카테고리 토글 + 공용 작성 폼 + 주보 PDF 첨부, 제출 후 /news 로 돌아간다.
 */
export function NewsWriteClient() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const [values, setValues] = useState<PostComposeValues>(EMPTY_VALUES);
  const [category, setCategory] = useState<PostCategory>("NOTICE");
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PostComposeField, string>>>({});

  useEffect(() => {
    apiGet<{ id: string; title: string }[]>("/api/events")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const clearFieldError = (field: PostComposeField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    if (submittingRef.current) return;

    const validation = validatePostCompose(values);
    if (!validation.ok) {
      toast.error(validation.message);
      if (validation.field) setFieldErrors({ [validation.field]: validation.message });
      return;
    }

    const requestToken = getSessionId();
    if (!requestToken) {
      toast.error("로그인 후 작성할 수 있어요.");
      router.push("/login?next=/news/write");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});

    try {
      await apiPost("/api/posts", { ...validation.payload, category, attachments });
      if (getSessionId() !== requestToken) return;
      toast.success("소식이 등록되었습니다.");
      router.push("/news");
    } catch (error) {
      if (getSessionId() !== requestToken) return;
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        toast.error("로그인 후 작성할 수 있어요.");
        router.push("/login?next=/news/write");
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error("소식 작성 권한이 없습니다.");
      } else {
        toast.error("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <StaffContentGuard next="/news/write">
      <PageShell paddingClassName="relative min-h-screen overflow-hidden px-6 pt-28 pb-20" orb="left">
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-3 tracking-[0.4em] uppercase" style={{ color: "var(--accent-secondary)", fontSize: 11 }}>
              Church News
            </p>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(32px, 4vw, 52px)", color: "var(--foreground)" }}>
              소식 작성
            </h1>
            <p className="mt-3 text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
              공지와 주보는 교회 소식 페이지에 게시됩니다.
            </p>
          </div>

          <div
            className="space-y-6 rounded-3xl border p-5 sm:p-8"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div>
              <p className="mb-2 text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
                카테고리
              </p>
              <div className="flex gap-2" role="group" aria-label="소식 카테고리 선택">
                {WRITE_CATEGORIES.map((item) => {
                  const badge = postCategoryBadge(item);
                  const active = item === category;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(item)}
                      disabled={submitting}
                      className="rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                      style={
                        active
                          ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                          : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground-muted)" }
                      }
                    >
                      <span aria-hidden>{badge.emoji}</span> {badge.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>
                첫 줄이 목록의 제목으로 표시됩니다. 주보는 PDF 첨부와 함께 올려주세요.
              </p>
            </div>

            <PostAttachmentsEditor attachments={attachments} onChange={setAttachments} disabled={submitting} />

            <PostComposeForm
              values={values}
              onChange={setValues}
              events={events}
              fieldErrors={fieldErrors}
              onFieldErrorClear={clearFieldError}
              textInputId="news-write-text"
              eventInputId="news-write-event"
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/news")}
                className="flex-1 rounded-xl py-3"
                style={{ background: "var(--border)", color: "var(--foreground)" }}
              >
                취소
              </button>
              <PostComposeSubmitButton
                submitting={submitting}
                disabled={!values.text.trim()}
                onClick={submit}
                idleLabel="소식 등록"
                pendingLabel="등록 중…"
              />
            </div>
          </div>
        </div>
      </PageShell>
    </StaffContentGuard>
  );
}
