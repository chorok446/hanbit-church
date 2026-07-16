"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { FallbackImage } from "@/components/fallback-image";
import { PostText } from "@/components/post-text";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  PostComposeForm,
  PostComposeSubmitButton,
  usePostComposeDraft,
} from "@/components/post-compose-form";
import {
  type PostComposeField,
  type PostComposeValues,
  validatePostCompose,
  POST_CATEGORIES,
  postCategoryLabel,
  isStaffWriteCategory,
  type PostAttachment,
  type PostCategory,
} from "@/data/posts";
import { POST_TEMPLATES, type PostTemplate } from "@/data/post-templates";
import { PageShell } from "@/components/page-shell";
import { PostAttachmentsEditor } from "@/components/post-attachments-editor";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";

const EMPTY_VALUES: PostComposeValues = {
  text: "",
  images: [],
  tags: [],
  event: "",
};

function composeHasContent(values: PostComposeValues): boolean {
  return (
    values.text.trim().length > 0 ||
    values.images.length > 0 ||
    values.tags.length > 0 ||
    values.event.trim().length > 0
  );
}

export default function PostCreateClient() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const restoredRef = useRef(false);

  const [values, setValues] = useState<PostComposeValues>(EMPTY_VALUES);
  const [category, setCategory] = useState<PostCategory>("SHARING");
  // 익명 기도제목(PRAYER 전용) — 서버가 공개 응답에서 작성자를 마스킹한다.
  const [anonymous, setAnonymous] = useState(false);
  // 공개 범위(PRAYER 전용). MEMBERS = 로그인 교인만 열람.
  const [visibility, setVisibility] = useState<"PUBLIC" | "MEMBERS">("PUBLIC");
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PostComposeField, string>>>({});

  const { name } = useAuthSession();
  const { profile } = useCurrentUserProfile();
  // 공지·주보·설교 작성 권한(최고 관리자·운영자·콘텐츠 관리자) — 백엔드 PostService 정책과 동일.
  const isStaff = getAdminPermissions(profile?.role).canManageContent;
  const confirm = useConfirm();
  const authorName = name ?? "사용자";

  // 공지·주보·설교(STAFF_WRITE)는 스태프 전용(서버 403). 비스태프에게는 선택지·예시를 숨기고,
  // 초안 복원 등으로 이미 선택돼 있으면 렌더 시점에 나눔으로 취급한다(effect 내 setState 대신 파생값 사용).
  // profile 로딩 전에는 되돌리지 않는다.
  const visibleCategories = POST_CATEGORIES.filter(
    (item) => isStaff || !isStaffWriteCategory(item.value),
  );
  const visibleTemplates = POST_TEMPLATES.filter(
    (template) => isStaff || !isStaffWriteCategory(template.category),
  );
  const effectiveCategory: PostCategory =
    profile && !isStaff && isStaffWriteCategory(category) ? "SHARING" : category;

  const { draftSaved, clearDraft } = usePostComposeDraft(
    { ...values, category: effectiveCategory },
    (draft) => {
      if (restoredRef.current) return;
      restoredRef.current = true;
      setValues({
        text: draft.text,
        images: draft.images,
        tags: draft.tags,
        event: draft.event,
      });
      if (draft.category && POST_CATEGORIES.some((item) => item.value === draft.category)) {
        setCategory(draft.category as PostCategory);
      }
    },
  );

  useEffect(() => {
    apiGet<{ id: string; title: string }[]>("/api/events")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (!getSessionId()) {
      toast.error("로그인 후 글을 작성할 수 있어요.");
      router.replace("/login?next=/posts/new");
    }
  }, [router]);

  useEffect(() => {
    if (!composeHasContent(values)) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [values]);

  const applyTemplate = async (template: PostTemplate) => {
    if (
      composeHasContent(values) &&
      !(await confirm({ message: "작성 중인 내용이 있습니다. 예시로 덮어쓸까요? (사진과 행사 연결은 유지됩니다)" }))
    ) {
      return;
    }
    setValues((current) => ({ ...current, ...template.values }));
    setCategory(template.category);
    setFieldErrors({});
    toast.success("기록 예시를 적용했어요. 괄호 안 내용을 채워주세요.");
  };

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
      if (validation.field) {
        setFieldErrors({ [validation.field]: validation.message });
      }
      return;
    }

    const requestToken = getSessionId();
    if (!requestToken) {
      toast.error("로그인 후 글을 작성할 수 있어요.");
      router.push("/login?next=/posts/new");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFieldErrors({});

    try {
      await apiPost("/api/posts", {
        ...validation.payload,
        category: effectiveCategory,
        // 첨부는 스태프 카테고리(공지·주보·설교)에서만 — 서버 normalizeAttachments 와 동일.
        attachments: isStaffWriteCategory(effectiveCategory) ? attachments : [],
        // 익명·공개 범위는 기도 카테고리에서만 유효 — 서버 검증과 동일 조건으로만 실어 보낸다.
        anonymous: effectiveCategory === "PRAYER" && anonymous,
        visibility: effectiveCategory === "PRAYER" ? visibility : "PUBLIC",
      });
      if (getSessionId() !== requestToken) return;
      clearDraft();
      toast.success("게시글이 등록되었습니다.");
      router.push("/feed");
    } catch (error) {
      if (getSessionId() !== requestToken) return;
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        toast.error("로그인 후 글을 작성할 수 있어요.");
        router.push("/login?next=/posts/new");
      } else {
        toast.error("게시에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <PageShell paddingClassName="relative min-h-screen overflow-hidden px-6 pt-28 pb-20" orb="left">
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-3 tracking-[0.4em] uppercase" style={{ color: "var(--accent-secondary)", fontSize: 11 }}>
            New Post
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(36px, 4.5vw, 60px)", color: "var(--foreground)" }}>
            새 글 쓰기
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div
            className="space-y-6 rounded-3xl border p-5 sm:p-8"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div>
              <p className="mb-2 text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
                기록 예시로 시작하기 <span className="normal-case tracking-normal opacity-70">(선택)</span>
              </p>
              <ul className="flex flex-wrap gap-2" aria-label="기록 예시 목록">
                {visibleTemplates.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => applyTemplate(template)}
                      disabled={submitting}
                      className="rounded-full px-3.5 py-2 text-[13px] transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{
                        background: "var(--border)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                      }}
                      aria-label={`${template.label} 예시 적용`}
                    >
                      {template.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>
                내용·태그·카테고리가 초안으로 채워집니다. 자유롭게 수정하세요.
              </p>
            </div>

            <div>
              <label htmlFor="post-category" className="mb-2 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
                카테고리
              </label>
              <select
                id="post-category"
                value={effectiveCategory}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
                className="ui-control px-3 py-2.5"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {visibleCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {effectiveCategory === "PRAYER" ? (
              <div className="space-y-4">
                <div
                  className="rounded-xl border px-4 py-3 text-[13px] leading-relaxed"
                  style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--foreground)" }}
                  role="note"
                >
                  <span aria-hidden>🙏</span> 기도요청에는 개인 정보가 포함될 수 있습니다. 실명·연락처 등 민감한
                  내용은 빼고 작성해 주세요.
                </div>

                <div>
                  <label htmlFor="post-visibility" className="mb-2 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
                    공개 범위
                  </label>
                  <select
                    id="post-visibility"
                    value={visibility === "MEMBERS" ? "members" : "public"}
                    onChange={(e) => setVisibility(e.target.value === "members" ? "MEMBERS" : "PUBLIC")}
                    disabled={submitting}
                    className="ui-control px-3 py-2.5"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="public">전체 공개</option>
                    <option value="members">교인만 공개 (로그인한 교우만 볼 수 있어요)</option>
                    <option value="prayer-team" disabled>
                      기도팀만 공개 (준비 중)
                    </option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    disabled={submitting}
                    className="h-4 w-4 accent-[var(--accent-strong)]"
                  />
                  익명으로 올리기 — 작성자가 &ldquo;익명&rdquo;으로 표시됩니다
                </label>
              </div>
            ) : null}

            {isStaff && isStaffWriteCategory(effectiveCategory) ? (
              <PostAttachmentsEditor attachments={attachments} onChange={setAttachments} disabled={submitting} />
            ) : null}

            <PostComposeForm
              values={values}
              onChange={setValues}
              events={events}
              fieldErrors={fieldErrors}
              onFieldErrorClear={clearFieldError}
              showDraftSaved={draftSaved}
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/feed")}
                className="flex-1 rounded-xl py-3"
                style={{
                  background: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                취소
              </button>
              <PostComposeSubmitButton
                submitting={submitting}
                disabled={!values.text.trim()}
                onClick={submit}
                idleLabel="게시하기"
                pendingLabel="게시 중…"
              />
            </div>
          </div>

          <div className="self-start lg:sticky lg:top-24">
            <p className="mb-3 text-[12px] tracking-[0.3em] uppercase" style={{ color: "var(--foreground-muted)" }}>
              미리보기
            </p>
            <article
              className="overflow-hidden rounded-2xl border shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)]"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-3 p-4">
                <CurrentUserAvatar />
                <div>
                  <div className="text-[14px]" style={{ color: "var(--foreground)" }}>
                    {authorName}
                  </div>
                  <div className="text-[11px] opacity-60" style={{ color: "var(--foreground)" }}>
                    방금 전 · {postCategoryLabel(effectiveCategory)}
                  </div>
                </div>
              </div>
              {values.images.length > 0 ? (
                values.images.length === 1 ? (
                  <div className="aspect-[4/3] overflow-hidden">
                    <FallbackImage
                      src={values.images[0]}
                      alt="첨부 이미지 미리보기 1"
                      errorText="이미지를 불러올 수 없어요"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid aspect-[4/3] grid-cols-2 gap-0.5">
                    {values.images.map((src, index) => (
                      <FallbackImage
                        key={src}
                        src={src}
                        alt={`첨부 이미지 미리보기 ${index + 1}`}
                        errorText="이미지를 불러올 수 없어요"
                        className="h-full w-full object-cover"
                      />
                    ))}
                  </div>
                )
              ) : (
                <div
                  className="flex aspect-[4/3] items-center justify-center"
                  style={{ background: "var(--border)" }}
                >
                  <ImageIcon size={32} style={{ color: "var(--foreground-muted)" }} aria-hidden />
                </div>
              )}
              <div className="space-y-3 p-4">
                {/* 본문은 리치 HTML(tiptap 출력)이라 raw 로 렌더하면 <p> 태그가 그대로 노출된다 — 상세/에디터 미리보기와 동일하게 PostText 로 렌더. */}
                {values.text.trim() ? (
                  <PostText text={values.text} style={{ color: "var(--foreground)", fontSize: 14, lineHeight: 1.6 }} />
                ) : (
                  <p className="opacity-40" style={{ color: "var(--foreground)", fontSize: 14, lineHeight: 1.6 }}>
                    내용이 여기에 표시됩니다…
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {values.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-secondary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
