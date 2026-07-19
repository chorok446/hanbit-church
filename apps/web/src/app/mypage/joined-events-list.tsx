"use client";

import { StaggerItem } from "@/components/scroll-reveal";
import Link from "next/link";
import { CalendarDays, ExternalLink, Loader2, PenLine, Users, UserMinus, EyeOff } from "lucide-react";
import { useState } from "react";
import { ListEmptyState } from "@/components/list-empty-state";
import { FallbackImage } from "@/components/fallback-image";
import { RecommendedEvents } from "@/components/recommended-events";
import { apiDelete, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { progressPercent } from "@/lib/progress";
import {
  eventRecruitMeta,
  fetchJoinedEventsPage,
  fetchMyEventsPage,
  type Event,
} from "@/data/events";
import { PaginatedSection } from "./paginated-section";

export type EventListMode = "joined" | "created";

const LIST_META: Record<
  EventListMode,
  { loading: string; error: string; emptyTitle: string; ctaHref: string; ctaLabel: string }
> = {
  joined: {
    loading: "참여 행사를 불러오는 중입니다.",
    error: "참여 행사를 불러오지 못했습니다.",
    emptyTitle: "아직 참여 신청한 행사가 없어요.",
    ctaHref: "/events",
    ctaLabel: "행사 둘러보기",
  },
  created: {
    loading: "개설 행사를 불러오는 중입니다.",
    error: "개설 행사를 불러오지 못했습니다.",
    emptyTitle: "아직 개설한 행사가 없어요.",
    ctaHref: "/events/new",
    ctaLabel: "행사 만들기",
  },
};

// 카드 하단 액션 버튼 공통 클래스. 색은 CSS 토큰이 테마를 처리한다.
const cardActionClass =
  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition-colors border-[rgba(var(--ink-rgb),0.12)] bg-[color:var(--glass-strong)] text-[color:var(--heading)] hover:bg-[color:var(--chip-bg)]";

function StatusBadge({ event }: { event: Event }) {
  const m = eventRecruitMeta(event);
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] tracking-[0.2em]" style={{ background: m.color, color: m.fg }}>
      {m.label}
    </span>
  );
}

function ProgressBar({ event }: { event: Event }) {
  const pct = progressPercent(event.joined, event.capacity);
  const meta = eventRecruitMeta(event);
  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(var(--ink-rgb), 0.09)" }}>
        <div
          className="bar-grow h-full rounded-full"
          style={{ width: `${pct}%`, background: meta.color }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: "rgba(var(--ink-rgb), 0.6)" }}>
        <span>
          {event.capacity > 0 ? (
            <>
              <b style={{ color: meta.color }}>{event.joined}</b> / {event.capacity}명
            </>
          ) : (
            "모집 인원 미정"
          )}
        </span>
        <span>{meta.label}</span>
      </div>
    </div>
  );
}

function EventCard({
  event,
  mode,
  leaving,
  onLeave,
}: {
  event: Event;
  mode: EventListMode;
  leaving: boolean;
  onLeave?: (eventId: string) => void;
}) {

  return (
    <article
      className="overflow-hidden rounded-2xl border shadow-[0_20px_45px_-25px_rgba(0,0,0,0.45)]"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <Link href={`/events/${event.id}`} className="block transition-transform hover:-translate-y-0.5">
        <div className="relative aspect-[4/3] overflow-hidden">
          <FallbackImage
            src={event.thumb}
            alt={`${event.title} 행사 이미지`}
            thumbnail
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-dark)]/70 via-transparent to-transparent" />
          <div className="absolute right-3 top-3">
            <StatusBadge event={event} />
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-[12px] text-white/90">
            <CalendarDays size={12} aria-hidden />
            <span className="truncate">
              {event.status === "open" || event.status === "upcoming"
                ? `${event.recruitStart} ~ ${event.recruitEnd}`
                : `${event.runStart} ~ ${event.runEnd}`}
            </span>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {event.hidden ? (
            <p
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              <EyeOff size={12} aria-hidden /> 운영 정책에 따라 숨김 처리된 행사입니다
            </p>
          ) : null}
          <h3
            className="line-clamp-2"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, color: "var(--foreground)", lineHeight: 1.3 }}
          >
            {event.title}
          </h3>
          <p className="line-clamp-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            {event.summary}
          </p>
          <ProgressBar event={event} />
          <div className="flex items-center justify-between pt-1 text-[12px]" style={{ color: "rgba(var(--ink-rgb), 0.6)" }}>
            <span className="flex items-center gap-1.5">
              <Users size={12} aria-hidden /> 모집 {event.capacity}명
            </span>
            <span>{event.daysLeftLabel}</span>
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <Link href={`/events/${event.id}`} className={cardActionClass}>
          <ExternalLink size={12} aria-hidden /> 행사 보기
        </Link>
        {mode === "created" && event.ownedByMe ? (
          <Link href={`/events/${event.id}/edit`} className={cardActionClass}>
            <PenLine size={12} aria-hidden /> 편집
          </Link>
        ) : null}
        {mode === "joined" && event.joinedByMe && onLeave ? (
          <button
            type="button"
            onClick={() => onLeave(event.id)}
            disabled={leaving}
            aria-busy={leaving || undefined}
            aria-label={leaving ? "참여 취소 처리 중" : "참여 취소"}
            className={`${cardActionClass} disabled:cursor-wait disabled:opacity-50`}
          >
            {leaving ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <UserMinus size={12} aria-hidden />}
            {leaving ? "취소 중…" : "참여 취소"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function UserEventsList({
  mode,
  page,
  onPageChange,
}: {
  mode: EventListMode;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const meta = LIST_META[mode];
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const leaveEvent = async (eventId: string, reload: () => void) => {
    if (leavingId) return;
    const requestToken = getSessionId();
    if (!requestToken) {
      clearSession();
      return;
    }
    setLeavingId(eventId);
    setActionError("");
    try {
      await apiDelete<Event>(`/api/events/${eventId}/join`);
      if (getSessionId() !== requestToken) return;
      reload();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        return;
      }
      setActionError("참여 취소에 실패했습니다.");
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <PaginatedSection<Event>
      identityKey={mode}
      page={page}
      onPageChange={onPageChange}
      fetcher={mode === "joined" ? fetchJoinedEventsPage : fetchMyEventsPage}
      loadingLabel={meta.loading}
      errorLabel={meta.error}
      empty={
        <div className="space-y-4">
          <ListEmptyState
            title={meta.emptyTitle}
            action={
              <Link href={meta.ctaHref} className="rounded-full cta-solid px-5 py-2 text-[13px] font-medium">
                {meta.ctaLabel}
              </Link>
            }
          />
          {mode === "joined" ? <RecommendedEvents /> : null}
        </div>
      }
      renderItems={(events, reload) => (
        <div className="space-y-4">
          {actionError ? (
            <div
              className="rounded-xl px-4 py-3 text-[13px]"
              role="alert"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {actionError}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <StaggerItem key={event.id} index={i}>
                <EventCard
                  event={event}
                  mode={mode}
                  leaving={leavingId === event.id}
                  onLeave={mode === "joined" ? (id) => leaveEvent(id, reload) : undefined}
                />
              </StaggerItem>
            ))}
          </div>
        </div>
      )}
    />
  );
}
