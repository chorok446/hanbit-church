"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDeleteVoid, ApiError, apiErrorMessage } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { postTimeLabel } from "@/data/posts";
import type { DevotionComment } from "@/data/devotion";

const MAX_LEN = 2000;

/** 큐티 은혜나눔 댓글 — 경량·평면. 로그인 교인만 작성, 본인·스태프만 삭제(canDelete 서버 판정). */
export function DevotionComments({ devotionId, initialCount }: { devotionId: string; initialCount: number }) {
  const { sessionId, hydrated } = useAuthSession();
  const signedIn = Boolean(sessionId);

  const [comments, setComments] = useState<DevotionComment[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGet<DevotionComment[]>(`/api/devotions/${devotionId}/comments`)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [devotionId, reloadTick]);

  const count = comments?.length ?? initialCount;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await apiPost<DevotionComment>(`/api/devotions/${devotionId}/comments`, { text: body });
      setComments((prev) => [...(prev ?? []), created]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? apiErrorMessage(err, "댓글을 남기지 못했습니다.") : "댓글을 남기지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      await apiDeleteVoid(`/api/devotions/${devotionId}/comments/${id}`);
      setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch {
      // 소유권 변화 등으로 실패하면 서버 상태로 재동기화한다.
      setReloadTick((t) => t + 1);
    }
  };

  return (
    <section aria-label="은혜나눔">
      <h2 className="text-[17px] font-semibold" style={{ color: "var(--heading)" }}>
        은혜나눔 <span style={{ color: "var(--foreground-muted)" }}>{count}</span>
      </h2>

      {hydrated && signedIn ? (
        <form onSubmit={onSubmit} className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            placeholder="오늘 말씀에서 받은 은혜를 나눠 주세요."
            aria-label="은혜나눔 작성"
            className="w-full resize-none rounded-2xl border px-4 py-3 text-[14px] leading-6 outline-none"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {text.length}/{MAX_LEN}
            </span>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="cta-solid rounded-full px-5 py-2 text-[13px] font-medium disabled:opacity-50"
            >
              나눔 남기기
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-1 text-[12.5px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          ) : null}
        </form>
      ) : hydrated ? (
        <p className="mt-4 text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
          <Link href="/login" className="underline" style={{ color: "var(--foreground)" }}>
            로그인
          </Link>{" "}
          후 은혜를 나눌 수 있습니다.
        </p>
      ) : null}

      <ul className="mt-6 flex flex-col gap-4">
        {loadError ? (
          <li role="alert" className="text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
            댓글을 불러오지 못했습니다.{" "}
            <button type="button" onClick={() => setReloadTick((t) => t + 1)} className="underline" style={{ color: "var(--foreground)" }}>
              다시 시도
            </button>
          </li>
        ) : comments === null ? (
          <li className="text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
            불러오는 중입니다…
          </li>
        ) : comments.length === 0 ? (
          <li className="text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
            첫 은혜나눔을 남겨 보세요.
          </li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="rounded-2xl border px-4 py-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold" style={{ color: "var(--heading)" }}>
                  {c.authorName}
                </span>
                <span className="flex items-center gap-2 text-[11.5px]" style={{ color: "var(--foreground-muted)" }}>
                  {postTimeLabel({ createdAt: c.createdAt, time: "" })}
                  {c.canDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label="댓글 삭제"
                      className="inline-flex items-center"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  ) : null}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-6" style={{ color: "var(--foreground)" }}>
                {c.text}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
