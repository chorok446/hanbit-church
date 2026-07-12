"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  History,
  ListMusic,
  Loader2,
  MapPin,
  Pencil,
  PlusCircle,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { formatDateLabel } from "@/data/calendar";
import { ApiError, apiErrorMessage } from "@/lib/api";
import {
  createPraiseSchedule,
  deletePraiseSchedule,
  fetchPraiseSchedules,
  fetchPraiseSetlists,
  PRAISE_SCHEDULE_TYPES,
  PRAISE_SCHEDULE_TYPE_LABELS,
  SCHEDULE_VISIBILITIES,
  SCHEDULE_VISIBILITY_LABELS,
  scheduleDateKey,
  scheduleTimeLabel,
  updatePraiseSchedule,
  type PraiseSchedule,
  type PraiseScheduleType,
  type PraiseScheduleVisibility,
  type PraiseSetlistSummary,
} from "@/data/praise-team";
import { usePraiseProfile } from "../praise-team-guard";
import { PraiseBand } from "../praise-ui";

const inputClass =
  "w-full rounded-2xl border px-4 py-3 text-[14px] outline-none placeholder:opacity-50";
const inputStyle = {
  background: "var(--panel)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--foreground-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/** ISO instant → datetime-local 입력값(로컬 "yyyy-MM-ddTHH:mm"). */
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Draft = {
  title: string;
  type: PraiseScheduleType;
  startAtLocal: string;
  endAtLocal: string;
  location: string;
  memo: string;
  visibility: PraiseScheduleVisibility;
  setlistId: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  type: "REHEARSAL",
  startAtLocal: "",
  endAtLocal: "",
  location: "",
  memo: "",
  visibility: "PRIVATE",
  setlistId: "",
};

function draftFrom(schedule: PraiseSchedule): Draft {
  return {
    title: schedule.title,
    type: schedule.type,
    startAtLocal: toLocalInputValue(schedule.startAt),
    endAtLocal: schedule.endAt ? toLocalInputValue(schedule.endAt) : "",
    location: schedule.location ?? "",
    memo: schedule.memo ?? "",
    visibility: schedule.visibility,
    setlistId: schedule.setlistId ?? "",
  };
}

/**
 * 찬양팀 일정 페이지 — 멤버는 다가오는 일정 열람, 리더는 추가/수정/삭제.
 * CHURCH/PUBLIC 일정은 교회 캘린더(행사·사역 캘린더 보기, 홈 이번 주 일정)에도 합류한다.
 */
export function ScheduleClient() {
  const profile = usePraiseProfile();
  const isLeader = profile.praiseRole === "LEADER" || profile.role === "ADMIN";

  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<{
    key: number;
    error: string | null;
    schedules: PraiseSchedule[];
  } | null>(null);
  // 폼 상태: null=닫힘, "new"=추가, 그 외=수정 대상 id.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 폼의 "연결할 콘티" 드롭다운 후보 — 리더가 폼을 열 때 한 번 불러온다.
  const [setlistOptions, setSetlistOptions] = useState<PraiseSetlistSummary[] | null>(null);
  // 기본은 다가오는 일정만. 켜면 지난 일정까지(오름차순) — 서버가 includePast 로 처리.
  const [includePast, setIncludePast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPraiseSchedules(includePast)
      .then((schedules) => {
        if (!cancelled) setResult({ key: retryTick, error: null, schedules });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: retryTick,
          schedules: [],
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick, includePast]);

  // 지난 일정 포함 토글 — retryTick 을 올려 로딩 상태를 거쳐 다시 불러온다.
  const togglePast = () => {
    setIncludePast((v) => !v);
    setRetryTick((t) => t + 1);
  };

  // 리더가 폼을 열면 콘티 목록을 준비한다(연결 드롭다운용). 실패해도 폼은 쓸 수 있다.
  useEffect(() => {
    if (!isLeader || editing === null || setlistOptions !== null) return;
    let cancelled = false;
    fetchPraiseSetlists()
      .then((list) => {
        if (!cancelled) setSetlistOptions(list);
      })
      .catch(() => {
        if (!cancelled) setSetlistOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isLeader, editing, setlistOptions]);

  const loading = result === null || result.key !== retryTick;
  const error = loading ? null : result.error;
  const schedules = loading || !result ? [] : result.schedules;

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  };

  const openEdit = (schedule: PraiseSchedule) => {
    setDraft(draftFrom(schedule));
    setEditing(schedule.id);
  };

  const save = async () => {
    if (saving) return;
    if (!draft.title.trim()) {
      toast.error("일정 제목을 입력해 주세요.");
      return;
    }
    if (!draft.startAtLocal) {
      toast.error("시작 시각을 선택해 주세요.");
      return;
    }
    const startAt = new Date(draft.startAtLocal);
    const endAt = draft.endAtLocal ? new Date(draft.endAtLocal) : null;
    if (endAt && endAt <= startAt) {
      toast.error("종료 시각은 시작 시각보다 뒤여야 합니다.");
      return;
    }
    const body = {
      title: draft.title.trim(),
      type: draft.type,
      startAt: startAt.toISOString(),
      endAt: endAt ? endAt.toISOString() : undefined,
      location: draft.location.trim() || undefined,
      memo: draft.memo.trim() || undefined,
      visibility: draft.visibility,
      setlistId: draft.setlistId || undefined,
    };
    setSaving(true);
    try {
      if (editing === "new") {
        await createPraiseSchedule(body);
        toast.success("일정을 등록했습니다.");
      } else if (editing) {
        await updatePraiseSchedule(editing, body);
        toast.success("일정을 수정했습니다.");
      }
      setEditing(null);
      setRetryTick((t) => t + 1);
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? apiErrorMessage(e, "일정 저장에 실패했습니다.")
          : "일정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (schedule: PraiseSchedule) => {
    if (deletingId) return;
    if (!window.confirm(`"${schedule.title}" 일정을 삭제할까요?`)) return;
    setDeletingId(schedule.id);
    try {
      await deletePraiseSchedule(schedule.id);
      toast.success("일정을 삭제했습니다.");
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("일정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PraiseBand
        eyebrow="Schedule"
        title="팀 일정"
        subtitle="교회 공개·외부 공개 일정은 교회 캘린더와 홈 이번 주 일정에도 표시됩니다."
        back={{ href: "/praise-team", label: "찬양팀 홈" }}
      />
      <PageShell orb="right" paddingClassName="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-[896px]">
        {editing === null ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={togglePast}
              aria-pressed={includePast}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium"
              style={
                includePast
                  ? { background: "var(--accent-soft)", borderColor: "var(--accent-strong)", color: "var(--accent-strong)" }
                  : { background: "var(--panel)", borderColor: "var(--border)", color: "var(--foreground-muted)" }
              }
            >
              <History size={14} aria-hidden />
              지난 일정 포함
            </button>
            {isLeader ? (
              <button
                type="button"
                onClick={openNew}
                className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-medium"
              >
                <PlusCircle size={14} aria-hidden />
                일정 추가
              </button>
            ) : null}
          </div>
        ) : null}

        {/* 추가/수정 폼 (리더) */}
        {isLeader && editing !== null ? (
          <section
            className="mt-6 rounded-3xl border p-5 sm:p-6"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                className="text-[18px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {editing === "new" ? "일정 추가" : "일정 수정"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="폼 닫기"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="제목 *">
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    maxLength={100}
                    placeholder="예: 주일 2부 찬양 리허설"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="종류">
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as PraiseScheduleType }))}
                  className={inputClass}
                  style={inputStyle}
                >
                  {PRAISE_SCHEDULE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PRAISE_SCHEDULE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="공개 범위">
                <select
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, visibility: e.target.value as PraiseScheduleVisibility }))
                  }
                  className={inputClass}
                  style={inputStyle}
                >
                  {SCHEDULE_VISIBILITIES.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {SCHEDULE_VISIBILITY_LABELS[visibility]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="시작 시각 *">
                <input
                  type="datetime-local"
                  value={draft.startAtLocal}
                  onChange={(e) => setDraft((d) => ({ ...d, startAtLocal: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="종료 시각 (선택)">
                <input
                  type="datetime-local"
                  value={draft.endAtLocal}
                  onChange={(e) => setDraft((d) => ({ ...d, endAtLocal: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="장소">
                <input
                  value={draft.location}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                  maxLength={100}
                  placeholder="예: 본당"
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="연결할 콘티 (선택)">
                  <select
                    value={draft.setlistId}
                    onChange={(e) => setDraft((d) => ({ ...d, setlistId: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">연결 안 함</option>
                    {(setlistOptions ?? []).map((setlist) => (
                      <option key={setlist.id} value={setlist.id}>
                        {formatDateLabel(setlist.worshipDate)} {setlist.worshipType} · {setlist.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  연결하면 일정 시각·장소가 바뀔 때 콘티 배정자에게 변경 알림이 갑니다.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Field label="메모">
                  <textarea
                    value={draft.memo}
                    onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
                    rows={2}
                    maxLength={500}
                    placeholder="예: 음향 콘솔 오픈 8:15"
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium disabled:opacity-60"
              >
                <Save size={14} aria-hidden />
                {saving ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex min-h-11 items-center rounded-full border px-5 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                취소
              </button>
            </div>
          </section>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <StatePanel compact>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>일정을 불러오는 중입니다…</p>
            </StatePanel>
          ) : error ? (
            <StatePanel compact>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                다시 시도
              </button>
            </StatePanel>
          ) : schedules.length === 0 ? (
            <StatePanel compact>
              <p>
                {includePast ? "등록된 일정이 없습니다." : "다가오는 일정이 없습니다."}
                {isLeader ? " “일정 추가”로 등록해 주세요." : ""}
              </p>
            </StatePanel>
          ) : (
            <ul className="space-y-3">
              {schedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className="rounded-3xl border p-5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium" style={{ color: "var(--heading)" }}>
                      <CalendarDays size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />
                      {schedule.title}
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                      >
                        {PRAISE_SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={
                          schedule.visibility === "PRIVATE"
                            ? { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--heading)" }
                            : { background: "var(--accent-soft)", color: "var(--accent-strong)" }
                        }
                      >
                        {SCHEDULE_VISIBILITY_LABELS[schedule.visibility] ?? schedule.visibility}
                      </span>
                    </p>
                    {isLeader ? (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(schedule)}
                          aria-label={`${schedule.title} 수정`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                          <Pencil size={13} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(schedule)}
                          disabled={deletingId === schedule.id}
                          aria-label={`${schedule.title} 삭제`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-50"
                          style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    <span>
                      {formatDateLabel(scheduleDateKey(schedule.startAt))} {scheduleTimeLabel(schedule.startAt)}
                      {schedule.endAt ? ` ~ ${scheduleTimeLabel(schedule.endAt)}` : ""}
                    </span>
                    {schedule.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} aria-hidden style={{ color: "var(--accent-strong)" }} />
                        {schedule.location}
                      </span>
                    ) : null}
                  </p>
                  {schedule.memo ? (
                    <p className="mt-1.5 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                      {schedule.memo}
                    </p>
                  ) : null}
                  {schedule.setlistId ? (
                    <Link
                      href={`/praise-team/setlists/${schedule.setlistId}`}
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[13px] underline underline-offset-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      <ListMusic size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                      {schedule.setlistTitle ? `콘티 보기 · ${schedule.setlistTitle}` : "콘티 보기"}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </PageShell>
    </>
  );
}
