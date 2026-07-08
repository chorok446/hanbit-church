"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { submitNewFamily } from "@/data/new-family";

const controlStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
} as const;

/** 새가족 등록 신청 폼. 비로그인 방문자도 보낼 수 있다. */
export function NewFamilyRegisterForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    const trimmedPhone = phone.trim();
    if (!/^[0-9+\-() ]{7,20}$/.test(trimmedPhone)) {
      toast.error("연락처를 숫자와 - 로 입력해주세요. (예: 010-1234-5678)");
      return;
    }

    setSubmitting(true);
    try {
      await submitNewFamily({ name: name.trim(), phone: trimmedPhone, note: note.trim() || undefined });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        toast.error("잠시 후 다시 시도해주세요.");
      } else {
        toast.error("접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className="rounded-3xl border p-8 text-center"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        role="status"
      >
        <p className="text-[18px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
          등록 신청이 접수되었습니다
        </p>
        <p className="mt-2 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          담당 교역자가 곧 연락드리겠습니다. 환영합니다! 🙏
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-3xl border p-8"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <h2 className="text-[20px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
        새가족 등록 신청
      </h2>
      <p className="text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
        연락처를 남겨주시면 담당 교역자가 인사드리고 예배와 등록 절차를 안내해 드립니다.
      </p>

      <div>
        <label htmlFor="nf-name" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          이름
        </label>
        <input
          id="nf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          required
          placeholder="이름을 입력해주세요"
          className="ui-control"
          style={controlStyle}
        />
      </div>

      <div>
        <label htmlFor="nf-phone" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          연락처
        </label>
        <input
          id="nf-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          required
          placeholder="010-1234-5678"
          className="ui-control"
          style={controlStyle}
        />
      </div>

      <div>
        <label htmlFor="nf-note" className="mb-1.5 block text-[12px] tracking-[0.2em] uppercase" style={{ color: "var(--foreground-muted)" }}>
          남기고 싶은 말 <span className="normal-case tracking-normal opacity-70">(선택)</span>
        </label>
        <textarea
          id="nf-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="편하게 남겨주세요. (예: 주일 2부 예배에 가보고 싶어요)"
          className="ui-control resize-none"
          style={controlStyle}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-medium disabled:opacity-50"
        style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
      >
        {submitting ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
        {submitting ? "접수 중…" : "등록 신청하기"}
      </button>
    </form>
  );
}
