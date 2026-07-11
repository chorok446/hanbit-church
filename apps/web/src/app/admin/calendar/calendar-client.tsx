"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { StatePanel } from "@/components/ui/state-panel";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import {
  eventTypeLabel,
  eventTypeStyle,
  formatDateLabel,
  MANUAL_CALENDAR_TYPES,
  type CalendarEventType,
  type ManualCalendarEventResponse,
} from "@/data/calendar";

// 절기 행사·심방·환영회 같은 표시 전용 일정을 등록한다. 캘린더(/events?view=calendar)와
// 홈 "이번 주 교회 일정"에 노출된다. 모집·참여가 필요한 일정은 행사 개설(/events/new)을 쓴다.
type FormValues = {
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  startTime: string;
  location: string;
};

const EMPTY_FORM: FormValues = { title: "", type: "etc", startDate: "", endDate: "", startTime: "", location: "" };

type Result = { status: "success" | "error"; items: ManualCalendarEventResponse[] };

export default function AdminCalendarClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<ManualCalendarEventResponse[]>("/api/admin/calendar")
      .then((items) => {
        if (!cancelled) setResult({ status: "success", items });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const patch = (partial: Partial<FormValues>) => setForm((prev) => ({ ...prev, ...partial }));

  const startEdit = (item: ManualCalendarEventResponse) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      type: (MANUAL_CALENDAR_TYPES as readonly string[]).includes(item.type)
        ? (item.type as CalendarEventType)
        : "etc",
      startDate: item.startDate,
      endDate: item.endDate ?? "",
      startTime: item.startTime ?? "",
      location: item.location ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async () => {
    if (saving) return;
    if (!form.title.trim()) {
      toast.error("일정 제목을 입력해주세요.");
      return;
    }
    if (!form.startDate) {
      toast.error("시작일을 선택해주세요.");
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/admin/calendar/${editingId}`, form);
        toast.success("일정을 수정했습니다.");
      } else {
        await apiPost("/api/admin/calendar", form);
        toast.success("일정을 등록했습니다.");
      }
      cancelEdit();
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("저장에 실패했습니다. 입력값을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: ManualCalendarEventResponse) => {
    if (deletingId) return;
    setDeletingId(item.id);
    try {
      await apiDelete(`/api/admin/calendar/${item.id}`);
      if (editingId === item.id) cancelEdit();
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setDeletingId(null);
    }
  };

  const labelStyle = { color: "var(--foreground-muted)" };
  const controlStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div className="space-y-8">
      <section
        className="rounded-2xl border p-5"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        aria-label={editingId ? "일정 수정" : "일정 등록"}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
            {editingId ? "일정 수정" : "새 일정 등록"}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
            >
              <X size={12} aria-hidden /> 수정 취소
            </button>
          ) : null}
        </div>
        <p className="mb-4 text-[12.5px] leading-5" style={labelStyle}>
          절기 행사·심방·환영회 같은 안내용 일정입니다. 캘린더와 홈 이번 주 일정에 노출됩니다. 신청·참여를 받는
          일정은 행사 개설을 이용해주세요.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="mc-title" className="mb-1.5 block text-[12px]" style={labelStyle}>
              제목 (필수)
            </label>
            <input
              id="mc-title"
              type="text"
              value={form.title}
              maxLength={100}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="예) 부활절 새벽 연합 예배"
              className="ui-control w-full placeholder:opacity-50"
              style={controlStyle}
            />
          </div>
          <div>
            <label htmlFor="mc-type" className="mb-1.5 block text-[12px]" style={labelStyle}>
              분류
            </label>
            <select
              id="mc-type"
              value={form.type}
              onChange={(e) => patch({ type: e.target.value as CalendarEventType })}
              className="ui-control w-full"
              style={controlStyle}
            >
              {MANUAL_CALENDAR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {eventTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mc-time" className="mb-1.5 block text-[12px]" style={labelStyle}>
              시각 (선택 — 표시용)
            </label>
            <input
              id="mc-time"
              type="text"
              value={form.startTime}
              maxLength={20}
              onChange={(e) => patch({ startTime: e.target.value })}
              placeholder="예) 오전 6:00"
              className="ui-control w-full placeholder:opacity-50"
              style={controlStyle}
            />
          </div>
          <div>
            <label htmlFor="mc-start" className="mb-1.5 block text-[12px]" style={labelStyle}>
              시작일 (필수)
            </label>
            <input
              id="mc-start"
              type="date"
              value={form.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              className="ui-control w-full"
              style={controlStyle}
            />
          </div>
          <div>
            <label htmlFor="mc-end" className="mb-1.5 block text-[12px]" style={labelStyle}>
              종료일 (선택 — 여러 날 일정만)
            </label>
            <input
              id="mc-end"
              type="date"
              value={form.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              className="ui-control w-full"
              style={controlStyle}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mc-location" className="mb-1.5 block text-[12px]" style={labelStyle}>
              장소 (선택)
            </label>
            <input
              id="mc-location"
              type="text"
              value={form.location}
              maxLength={100}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder="예) 본당"
              className="ui-control w-full placeholder:opacity-50"
              style={controlStyle}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          aria-busy={saving}
          className="cta-solid mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-medium disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <CalendarDays size={14} aria-hidden />}
          {editingId ? "수정 저장" : "일정 등록"}
        </button>
      </section>

      <section aria-label="등록된 일정">
        <h2 className="mb-3 text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
          등록된 일정
        </h2>
        {result === null ? (
          <StatePanel compact>
            <Loader2 className="animate-spin" size={20} aria-hidden />
            <p>일정을 불러오는 중입니다…</p>
          </StatePanel>
        ) : result.status === "error" ? (
          <StatePanel compact>
            <p>일정을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
              className="rounded-full border px-4 py-2 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              다시 시도
            </button>
          </StatePanel>
        ) : result.items.length === 0 ? (
          <StatePanel compact>
            <p>등록된 수동 일정이 없습니다. 위 양식으로 첫 일정을 등록해보세요.</p>
          </StatePanel>
        ) : (
          <ul className="space-y-3">
            {result.items.map((item) => {
              const typeStyle = eventTypeStyle(
                (MANUAL_CALENDAR_TYPES as readonly string[]).includes(item.type)
                  ? (item.type as CalendarEventType)
                  : "etc",
              );
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={typeStyle}>
                        {eventTypeLabel(
                          (MANUAL_CALENDAR_TYPES as readonly string[]).includes(item.type)
                            ? (item.type as CalendarEventType)
                            : "etc",
                        )}
                      </span>
                      <span className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                      {formatDateLabel(item.startDate)}
                      {item.endDate ? ` ~ ${formatDateLabel(item.endDate)}` : ""}
                      {item.startTime ? ` · ${item.startTime}` : ""}
                      {item.location ? (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <MapPin size={11} aria-hidden /> {item.location}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                      {item.createdBy} 등록
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px]"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      <Pencil size={13} aria-hidden /> 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      disabled={deletingId !== null}
                      aria-busy={deletingId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    >
                      {deletingId === item.id ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden />
                      ) : (
                        <Trash2 size={13} aria-hidden />
                      )}
                      삭제
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
