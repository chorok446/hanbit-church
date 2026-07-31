"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, ApiError, apiErrorMessage } from "@/lib/api";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";
import type { Devotion } from "@/data/devotion";

/** KST 오늘 날짜 YYYY-MM-DD (create 기본값). 고정 +09:00 오프셋. */
function kstToday(): string {
  const kst = new Date(Date.now() + 9 * 3_600_000);
  return kst.toISOString().slice(0, 10);
}

type Fields = { date: string; verseRef: string; verseText: string; meditation: string; authorName: string };

const EMPTY: Fields = { date: "", verseRef: "", verseText: "", meditation: "", authorName: "" };

const LABEL_CLS = "mb-1.5 block text-[13px] font-medium";
const INPUT_CLS = "w-full rounded-xl border px-4 py-2.5 text-[14px] outline-none";

/** 큐티 등록·수정 폼(스태프 전용). id 가 있으면 관리자 상세를 불러와 수정 모드로 동작한다. */
export function DevotionForm({ id }: { id?: string }) {
  const router = useRouter();
  const { profile, loading } = useCurrentUserProfile();
  const canManage = getAdminPermissions(profile?.role).canManageContent;

  const [fields, setFields] = useState<Fields>(() => (id ? EMPTY : { ...EMPTY, date: kstToday() }));
  const [ready, setReady] = useState(!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 수정 모드: 관리자 상세를 불러와 프리필(예약분 포함).
  useEffect(() => {
    if (!id || !canManage) return;
    let cancelled = false;
    apiGet<Devotion>(`/api/admin/devotions/${id}`)
      .then((d) => {
        if (cancelled) return;
        setFields({
          date: d.date,
          verseRef: d.verseRef,
          verseText: d.verseText,
          meditation: d.meditation,
          authorName: d.authorName,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, canManage]);

  if (loading) {
    // 프로필 판정 전 — 잠깐 대기(비스태프에게 폼을 깜빡 노출하지 않는다).
    return (
      <p className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
        확인 중입니다…
      </p>
    );
  }
  if (!canManage) {
    return (
      <p className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
        묵상을 등록할 권한이 없습니다.
      </p>
    );
  }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const body = {
      date: fields.date,
      verseRef: fields.verseRef.trim(),
      verseText: fields.verseText.trim(),
      meditation: fields.meditation.trim(),
      authorName: fields.authorName.trim() || undefined,
    };
    try {
      const saved = id
        ? await apiPut<Devotion>(`/api/admin/devotions/${id}`, body)
        : await apiPost<Devotion>("/api/admin/devotions", body);
      router.push(`/devotion/${saved.id}`);
      router.refresh();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof ApiError ? apiErrorMessage(err, "저장하지 못했습니다.") : "저장하지 못했습니다.");
    }
  };

  const disabled = !ready || submitting || !fields.date || !fields.verseRef.trim() || !fields.verseText.trim() || !fields.meditation.trim();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="dv-date" className={LABEL_CLS} style={{ color: "var(--heading)" }}>
          날짜
        </label>
        <input
          id="dv-date"
          type="date"
          value={fields.date}
          onChange={set("date")}
          required
          className={INPUT_CLS}
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
        <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          오늘 이후 날짜로 등록하면 그날 자동으로 공개됩니다(미리 등록).
        </p>
      </div>

      <div>
        <label htmlFor="dv-ref" className={LABEL_CLS} style={{ color: "var(--heading)" }}>
          성경 구절 (예: 시편 23:1)
        </label>
        <input
          id="dv-ref"
          value={fields.verseRef}
          onChange={set("verseRef")}
          required
          maxLength={120}
          className={INPUT_CLS}
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </div>

      <div>
        <label htmlFor="dv-text" className={LABEL_CLS} style={{ color: "var(--heading)" }}>
          말씀 본문
        </label>
        <textarea
          id="dv-text"
          value={fields.verseText}
          onChange={set("verseText")}
          required
          rows={3}
          maxLength={500}
          className={`${INPUT_CLS} resize-none leading-6`}
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", fontFamily: "var(--font-display)" }}
        />
      </div>

      <div>
        <label htmlFor="dv-med" className={LABEL_CLS} style={{ color: "var(--heading)" }}>
          묵상글
        </label>
        <textarea
          id="dv-med"
          value={fields.meditation}
          onChange={set("meditation")}
          required
          rows={10}
          maxLength={5000}
          className={`${INPUT_CLS} resize-y leading-7`}
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </div>

      <div>
        <label htmlFor="dv-author" className={LABEL_CLS} style={{ color: "var(--heading)" }}>
          작성자 표기 (선택 — 비우면 본인 이름)
        </label>
        <input
          id="dv-author"
          value={fields.authorName}
          onChange={set("authorName")}
          maxLength={60}
          className={INPUT_CLS}
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        />
      </div>

      {error ? (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="cta-solid rounded-full px-6 py-3 text-[14px] font-medium disabled:opacity-50"
        >
          {id ? "수정 저장" : "등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border px-6 py-3 text-[14px] font-medium cta-outline"
        >
          취소
        </button>
      </div>
    </form>
  );
}
