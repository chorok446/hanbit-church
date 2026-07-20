"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { submitNewFamily } from "@/data/new-family";

const controlStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
} as const;

/** 방문 예정 예배 선택지 (선택 사항). */
const visitServiceOptions = ["주일 1부 예배", "주일 2부 예배", "수요 예배", "아직 정하지 않았어요"] as const;

/** 함께 오시는 분 선택지 (선택 사항). */
const companionOptions = ["혼자 방문", "가족과 함께", "지인과 함께", "기타"] as const;

/**
 * 방문 예정 예배·함께 오시는 분은 백엔드 스키마(`POST /api/new-family`: name·phone·note)에
 * 별도 필드가 없다. 선택된 값을 note 앞에 구조화 텍스트로 병합해 전송하는 규약을 쓴다:
 *   "[방문 예정: 주일 2부 예배] [동행: 가족과 함께]\n남긴 말..."
 * 관리자 새가족 목록이 note를 그대로 보여주므로 이 형식이 그대로 읽힌다.
 * note 전체는 서버에서 500자 제한(NewFamilyService.MAX_NOTE) — 접두어 여유분을 두고
 * 자유 입력은 400자로 제한한다.
 */
function buildNote(visitService: string, companion: string, message: string): string | undefined {
  const tags = [
    visitService ? `[방문 예정: ${visitService}]` : null,
    companion ? `[동행: ${companion}]` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const body = message.trim();
  const merged = [tags, body].filter(Boolean).join("\n");
  return merged || undefined;
}

const INITIAL_FIELDS = { name: "", phone: "", visitService: "", companion: "", note: "" };

type Status = { type: "success" | "error"; text: string } | null;

/** 새가족 등록 신청 폼. 비로그인 방문자도 보낼 수 있다 (공개 API, rate limit 있음). */
export function NewFamilyRegisterForm() {
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const setField = (key: keyof typeof INITIAL_FIELDS) => (value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!fields.name.trim()) {
      setStatus({ type: "error", text: "이름을 입력해 주세요." });
      return;
    }
    const trimmedPhone = fields.phone.trim();
    if (!/^[0-9+\-() ]{7,20}$/.test(trimmedPhone)) {
      setStatus({ type: "error", text: "연락처를 숫자와 - 로 입력해 주세요. (예: 010-1234-5678)" });
      return;
    }
    if (!consent) {
      setStatus({ type: "error", text: "개인정보 수집·이용에 동의해 주셔야 신청할 수 있습니다." });
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      await submitNewFamily({
        name: fields.name.trim(),
        phone: trimmedPhone,
        note: buildNote(fields.visitService, fields.companion, fields.note),
      });
      setFields(INITIAL_FIELDS);
      setConsent(false);
      setStatus({ type: "success", text: "신청이 접수되었습니다. 담당자가 확인 후 연락드리겠습니다." });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setStatus({ type: "error", text: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." });
      } else {
        setStatus({ type: "error", text: "신청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="새가족 등록 신청"
      className="space-y-4 rounded-3xl border p-6 sm:p-8"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div>
        <label htmlFor="nf-name" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          이름 <span className="normal-case tracking-normal" style={{ color: "var(--accent-strong)" }}>(필수)</span>
        </label>
        <input
          id="nf-name"
          name="name"
          value={fields.name}
          onChange={(e) => setField("name")(e.target.value)}
          maxLength={30}
          required
          placeholder="이름을 입력해 주세요"
          className="ui-control"
          style={controlStyle}
        />
      </div>

      <div>
        <label htmlFor="nf-phone" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          연락처 <span className="normal-case tracking-normal" style={{ color: "var(--accent-strong)" }}>(필수)</span>
        </label>
        <input
          id="nf-phone"
          name="phone"
          type="tel"
          value={fields.phone}
          onChange={(e) => setField("phone")(e.target.value)}
          maxLength={20}
          required
          placeholder="010-1234-5678"
          className="ui-control"
          style={controlStyle}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nf-visit" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
            방문 예정 예배 <span className="normal-case tracking-normal">(선택)</span>
          </label>
          <select
            id="nf-visit"
            name="visitService"
            value={fields.visitService}
            onChange={(e) => setField("visitService")(e.target.value)}
            className="ui-control"
            style={controlStyle}
          >
            <option value="">선택해 주세요</option>
            {visitServiceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nf-companion" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
            함께 오시는 분 <span className="normal-case tracking-normal">(선택)</span>
          </label>
          <select
            id="nf-companion"
            name="companion"
            value={fields.companion}
            onChange={(e) => setField("companion")(e.target.value)}
            className="ui-control"
            style={controlStyle}
          >
            <option value="">선택해 주세요</option>
            {companionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="nf-note" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          남기고 싶은 말 <span className="normal-case tracking-normal">(선택)</span>
        </label>
        <textarea
          id="nf-note"
          name="note"
          value={fields.note}
          onChange={(e) => setField("note")(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder="편하게 남겨주세요. 예: 주일 2부 예배에 가족과 함께 방문 예정입니다."
          className="ui-control resize-none"
          style={controlStyle}
        />
      </div>

      <div className="rounded-xl border px-4 py-3.5" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <label htmlFor="nf-consent" className="flex cursor-pointer items-start gap-3 text-[14px]" style={{ color: "var(--foreground)" }}>
          <input
            id="nf-consent"
            name="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent-strong)]"
          />
          <span>
            새가족 안내를 위해 이름과 연락처를 수집·이용하는 것에 동의합니다.{" "}
            <span className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
              (필수)
            </span>
          </span>
        </label>
        <p className="mt-1.5 pl-8 text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
          수집된 정보는 새가족 안내와 연락 목적으로만 사용됩니다.
        </p>
      </div>

      {status ? (
        <p
          role={status.type === "error" ? "alert" : "status"}
          className="rounded-xl border px-4 py-3 text-[14px] leading-6"
          style={
            status.type === "error"
              ? { borderColor: "var(--danger)", color: "var(--danger)", background: "var(--danger-soft)" }
              : { borderColor: "var(--border)", color: "var(--heading)", background: "var(--accent-soft)" }
          }
        >
          {status.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="cta-solid inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-medium disabled:opacity-50"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
        {submitting ? "접수 중…" : "등록 신청하기"}
      </button>
    </form>
  );
}
