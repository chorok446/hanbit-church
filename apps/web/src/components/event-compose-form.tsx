"use client";

import { useEffect, useId } from "react";
import { Loader2 } from "lucide-react";
import { EventComposeBody } from "@/components/event-compose-body";
import { EventComposeSchedule } from "@/components/event-compose-schedule";
import { EventComposeThumb } from "@/components/event-compose-thumb";
import {
  EVENT_COMPOSE_DRAFT_KEY,
  DEFAULT_EVENT_COMPOSE_VALUES,
  type EventComposeField,
  type EventComposeValues,
} from "@/data/events";

export { EVENT_COMPOSE_DRAFT_KEY };

type EventComposeFormProps = {
  values: EventComposeValues;
  onChange: (values: EventComposeValues) => void;
  fieldErrors?: Partial<Record<EventComposeField, string>>;
  onFieldErrorClear?: (field: EventComposeField) => void;
  showDraftSaved?: boolean;
  disabled?: boolean;
  titleInputId?: string;
  /** 모집중 수정 — 제목·기간·정원 입력을 잠근다(백엔드 409 와 짝). */
  lockRecruitFields?: boolean;
};

export function EventComposeForm({
  values,
  onChange,
  fieldErrors = {},
  onFieldErrorClear,
  showDraftSaved = false,
  disabled = false,
  // 모집중 수정 모드 — 참여 조건(제목·기간·정원)은 잠그고 안내 정보만 편집을 허용한다.
  lockRecruitFields = false,
  titleInputId = "event-title",
}: EventComposeFormProps) {
  const summaryInputId = useId();

  const labelStyle = { color: "var(--foreground-muted)" };
  const controlStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  };

  const patch = (partial: Partial<EventComposeValues>) => onChange({ ...values, ...partial });

  const titleErrorId = `${titleInputId}-error`;
  const summaryErrorId = `${summaryInputId}-error`;

  return (
    <div className="space-y-6">
      {showDraftSaved ? (
        <p className="text-[12px]" style={{ color: "var(--accent-secondary)" }} role="status" aria-live="polite">
          임시 저장됨
        </p>
      ) : null}

      <div>
        <label htmlFor={titleInputId} className="mb-2 block text-[12px] tracking-[0.2em] uppercase" style={labelStyle}>
          제목 <span className="sr-only">(필수)</span>
        </label>
        <input
          id={titleInputId}
          type="text"
          value={values.title}
          onChange={(e) => {
            patch({ title: e.target.value });
            onFieldErrorClear?.("title");
          }}
          placeholder="예) 한강공원 플로깅 데이"
          required
          disabled={disabled || lockRecruitFields}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? titleErrorId : undefined}
          className="ui-control w-full placeholder:opacity-50"
          style={controlStyle}
        />
        {fieldErrors.title ? (
          <p id={titleErrorId} className="mt-1.5 text-[12px]" style={{ color: "var(--danger)" }} role="alert">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={summaryInputId} className="mb-2 block text-[12px] tracking-[0.2em] uppercase" style={labelStyle}>
          한 줄 요약 <span className="normal-case tracking-normal opacity-70">(선택)</span>
        </label>
        <input
          id={summaryInputId}
          type="text"
          value={values.summary}
          onChange={(e) => {
            patch({ summary: e.target.value });
            onFieldErrorClear?.("summary");
          }}
          placeholder="짧게 행사를 소개해 주세요"
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.summary)}
          aria-describedby={fieldErrors.summary ? summaryErrorId : undefined}
          className="ui-control w-full placeholder:opacity-50"
          style={controlStyle}
        />
        {fieldErrors.summary ? (
          <p id={summaryErrorId} className="mt-1.5 text-[12px]" style={{ color: "var(--danger)" }} role="alert">
            {fieldErrors.summary}
          </p>
        ) : null}
      </div>

      <EventComposeThumb
        thumb={values.thumb}
        disabled={disabled}
        fieldError={fieldErrors.thumb}
        onFieldErrorClear={() => onFieldErrorClear?.("thumb")}
        onThumbChange={(thumb) => patch({ thumb })}
      />

      {lockRecruitFields ? (
        <p className="rounded-xl border px-4 py-3 text-[12.5px]" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground-muted)" }}>
          모집중에는 제목·모집/진행 기간·정원을 변경할 수 없어요. 안내 정보를 수정하면 참여자에게 알림이 갑니다.
        </p>
      ) : null}
      <EventComposeSchedule
        recruitStart={values.recruitStart}
        recruitEnd={values.recruitEnd}
        runStart={values.runStart}
        runEnd={values.runEnd}
        capacity={values.capacity}
        fieldErrors={fieldErrors}
        disabled={disabled || lockRecruitFields}
        onFieldErrorClear={onFieldErrorClear}
        onChange={(partial) => patch(partial)}
      />

      <EventComposeBody
        body={values.body}
        fieldError={fieldErrors.body}
        disabled={disabled}
        onFieldErrorClear={() => onFieldErrorClear?.("body")}
        onBodyChange={(body) => patch({ body })}
      />

      {/* 실무 안내(전부 선택) — 비워두면 상세에서 해당 행이 노출되지 않는다. */}
      <fieldset className="space-y-4 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
        <legend className="px-1 text-[12px] tracking-[0.2em] uppercase" style={labelStyle}>
          실무 안내 (선택)
        </legend>
        {(
          [
            { key: "place", label: "장소", placeholder: "예) 본당 2층" },
            { key: "audience", label: "대상", placeholder: "예) 청년부, 누구나" },
            { key: "fee", label: "참가비", placeholder: "예) 1인 1만원 (없으면 비워두세요)" },
            { key: "supplies", label: "준비물", placeholder: "예) 성경, 필기구" },
            { key: "contact", label: "문의", placeholder: "예) 청년부 임원, 교회 사무실" },
          ] as const
        ).map((field) => {
          const inputId = `${titleInputId}-${field.key}`;
          const errorId = `${inputId}-error`;
          const error = fieldErrors[field.key];
          return (
            <div key={field.key}>
              <label htmlFor={inputId} className="mb-2 block text-[12px]" style={labelStyle}>
                {field.label}
              </label>
              <input
                id={inputId}
                type="text"
                value={values[field.key]}
                onChange={(e) => {
                  patch({ [field.key]: e.target.value });
                  onFieldErrorClear?.(field.key);
                }}
                placeholder={field.placeholder}
                disabled={disabled}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className="ui-control w-full placeholder:opacity-50"
                style={controlStyle}
              />
              {error ? (
                <p id={errorId} className="mt-1.5 text-[12px]" style={{ color: "var(--danger)" }} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}

export function useEventComposeDraft(
  values: EventComposeValues,
  onRestore: (draft: EventComposeValues) => void,
) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EVENT_COMPOSE_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<EventComposeValues>;
      if (!draft || typeof draft !== "object") return;
      onRestore({
        title: typeof draft.title === "string" ? draft.title : "",
        summary: typeof draft.summary === "string" ? draft.summary : "",
        body: typeof draft.body === "string" ? draft.body : "",
        thumb: typeof draft.thumb === "string" ? draft.thumb : "",
        recruitStart: typeof draft.recruitStart === "string" ? draft.recruitStart : DEFAULT_EVENT_COMPOSE_VALUES.recruitStart,
        recruitEnd: typeof draft.recruitEnd === "string" ? draft.recruitEnd : DEFAULT_EVENT_COMPOSE_VALUES.recruitEnd,
        runStart: typeof draft.runStart === "string" ? draft.runStart : DEFAULT_EVENT_COMPOSE_VALUES.runStart,
        runEnd: typeof draft.runEnd === "string" ? draft.runEnd : DEFAULT_EVENT_COMPOSE_VALUES.runEnd,
        capacity: typeof draft.capacity === "string" ? draft.capacity : DEFAULT_EVENT_COMPOSE_VALUES.capacity,
        place: typeof draft.place === "string" ? draft.place : "",
        audience: typeof draft.audience === "string" ? draft.audience : "",
        fee: typeof draft.fee === "string" ? draft.fee : "",
        supplies: typeof draft.supplies === "string" ? draft.supplies : "",
        contact: typeof draft.contact === "string" ? draft.contact : "",
      });
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, []);

  useEffect(() => {
    if (!eventComposeDraftHasContent(values)) {
      localStorage.removeItem(EVENT_COMPOSE_DRAFT_KEY);
      return;
    }
    localStorage.setItem(EVENT_COMPOSE_DRAFT_KEY, JSON.stringify(values));
  }, [values]);

  const draftSaved = eventComposeDraftHasContent(values);

  const clearDraft = () => {
    localStorage.removeItem(EVENT_COMPOSE_DRAFT_KEY);
  };

  return { draftSaved, clearDraft };
}

function eventComposeDraftHasContent(values: EventComposeValues): boolean {
  return (
    values.title.trim().length > 0 ||
    values.summary.trim().length > 0 ||
    values.body.trim().length > 0 ||
    values.thumb.trim().length > 0 ||
    values.capacity !== DEFAULT_EVENT_COMPOSE_VALUES.capacity ||
    values.recruitStart !== DEFAULT_EVENT_COMPOSE_VALUES.recruitStart ||
    values.recruitEnd !== DEFAULT_EVENT_COMPOSE_VALUES.recruitEnd ||
    values.runStart !== DEFAULT_EVENT_COMPOSE_VALUES.runStart ||
    values.runEnd !== DEFAULT_EVENT_COMPOSE_VALUES.runEnd ||
    values.place.trim().length > 0 ||
    values.audience.trim().length > 0 ||
    values.fee.trim().length > 0 ||
    values.supplies.trim().length > 0 ||
    values.contact.trim().length > 0
  );
}

type SubmitButtonProps = {
  submitting: boolean;
  disabled: boolean;
  onClick: () => void;
  idleLabel: string;
  pendingLabel: string;
};

export function EventComposeSubmitButton({
  submitting,
  disabled,
  onClick,
  idleLabel,
  pendingLabel,
}: SubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || submitting}
      aria-busy={submitting}
      className="cta-solid inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium disabled:opacity-40"
    >
      {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      {submitting ? pendingLabel : idleLabel}
    </button>
  );
}
