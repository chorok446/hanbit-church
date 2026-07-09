"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  ListMusic,
  Loader2,
  MapPin,
  Megaphone,
  Pin,
  PlusCircle,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { formatDateLabel } from "@/data/calendar";
import { ApiError } from "@/lib/api";
import {
  fetchPraiseSchedules,
  fetchPraiseSetlist,
  fetchPraiseSetlists,
  pickUpcomingSetlist,
  praisePartLabel,
  PRAISE_ROLE_LABELS,
  PRAISE_SCHEDULE_TYPE_LABELS,
  PRAISE_SONG_TYPE_LABELS,
  SCHEDULE_VISIBILITY_LABELS,
  scheduleDateKey,
  scheduleTimeLabel,
  sortPraiseNotices,
  type PraiseSchedule,
  type PraiseSetlist,
} from "@/data/praise-team";
import { usePraiseProfile } from "./praise-team-guard";
import { AttendanceBadge, BandPill, PraiseBand, PraiseCard, SetlistStatusBadge } from "./praise-ui";

type Result = {
  key: number;
  error: string | null;
  setlist: PraiseSetlist | null;
  schedules: PraiseSchedule[];
};

const MAX_DASHBOARD_SCHEDULES = 4;

/** 찬양팀 대시보드 — 콘티·공지·참석·팀 일정은 백엔드 /api/praise 실데이터. */
export function PraiseTeamDashboard() {
  const profile = usePraiseProfile();
  const isLeader = profile.praiseRole === "LEADER" || profile.role === "ADMIN";

  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPraiseSetlists().then((summaries) => {
        const upcoming = pickUpcomingSetlist(summaries);
        return upcoming ? fetchPraiseSetlist(upcoming.id) : null;
      }),
      // 팀 일정을 못 불러와도 대시보드 본체는 그린다.
      fetchPraiseSchedules().catch(() => [] as PraiseSchedule[]),
    ])
      .then(([setlist, schedules]) => {
        if (!cancelled) setResult({ key: retryTick, error: null, setlist, schedules });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: retryTick,
          setlist: null,
          schedules: [],
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "콘티를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const loading = result === null || result.key !== retryTick;
  const error = loading ? null : result.error;
  const setlist = loading ? null : result.setlist;
  const schedules = loading || !result ? [] : result.schedules.slice(0, MAX_DASHBOARD_SCHEDULES);

  const myParts = profile.praiseParts ?? [];
  const roleLabel = profile.praiseRole
    ? PRAISE_ROLE_LABELS[profile.praiseRole]
    : "관리자(참관)";
  const myAssignments = setlist?.assignments.filter((a) => a.userId === profile.id) ?? [];
  const myStatus = myAssignments[0]?.status ?? "PENDING";
  const notices = sortPraiseNotices(setlist?.notices ?? []);

  return (
    <>
      <PraiseBand
        eyebrow="Praise Team"
        title="찬양팀"
        subtitle={
          <>
            {profile.name}님, 환영합니다. ({roleLabel}
            {myParts.length > 0 ? ` · ${myParts.map(praisePartLabel).join(", ")}` : ""})
          </>
        }
        pills={
          <>
            <BandPill href="/praise-team/setlists">
              <ListMusic size={14} aria-hidden />
              전체 콘티
            </BandPill>
            <BandPill href="/praise-team/schedule">
              <CalendarDays size={14} aria-hidden />
              팀 일정
            </BandPill>
            <BandPill href="/praise-team/members">
              <Users size={14} aria-hidden />
              팀원 목록
            </BandPill>
            {isLeader ? (
              <BandPill href="/praise-team/setlists/new" filled>
                <PlusCircle size={14} aria-hidden />새 콘티 작성
              </BandPill>
            ) : null}
          </>
        }
      />
      <PageShell orb="right" paddingClassName="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-[896px]">
          <div className="space-y-6">
          {loading ? (
            <StatePanel compact>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>콘티를 불러오는 중입니다…</p>
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
          ) : setlist ? (
            <>
              {/* 이번 주 예배 */}
              <PraiseCard
                label="This Week"
                title={`${formatDateLabel(setlist.worshipDate)} ${setlist.worshipType}`}
                action={<SetlistStatusBadge status={setlist.status} />}
              >
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {setlist.serviceTime ? <span>{setlist.serviceTime}</span> : null}
                  {setlist.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                      {setlist.location}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <ListMusic size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />곡{" "}
                    {setlist.songs.length}개
                  </span>
                </div>
                {setlist.rehearsalTime ? (
                  <p className="mt-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                    리허설: {setlist.rehearsalTime}
                  </p>
                ) : null}
                <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
                  <Link
                    href={`/praise-team/setlists/${setlist.id}`}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-medium text-[var(--cta-fg)]"
                    style={{ background: "var(--cta-bg)" }}
                  >
                    <ListMusic size={14} aria-hidden />
                    콘티 보기
                  </Link>
                  <Link
                    href={`/praise-team/setlists/${setlist.id}#attendance`}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-5 text-[13px]"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    <ClipboardCheck size={14} aria-hidden />
                    참석 체크
                  </Link>
                </div>
              </PraiseCard>

              {/* 내 파트 */}
              <PraiseCard label="My Part" title="내 파트">
                {myAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {myAssignments.map((assignment) => (
                      <span
                        key={assignment.id}
                        className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                      >
                        {praisePartLabel(assignment.part)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                    이번 콘티에 아직 배정되지 않았습니다. 배정은 찬양팀 리더가 관리해요.
                  </p>
                )}
                <ol className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  {setlist.songs.map((song) => (
                    <li key={song.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px]">
                      <span
                        className="w-4 text-right text-[12px] tabular-nums"
                        style={{ color: "var(--accent-strong)" }}
                      >
                        {song.order}
                      </span>
                      <span style={{ color: "var(--foreground)" }}>{song.title}</span>
                      <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                        {song.key} · {song.bpm}BPM · {PRAISE_SONG_TYPE_LABELS[song.type]}
                      </span>
                    </li>
                  ))}
                </ol>
                {myAssignments.length > 0 ? (
                  <p
                    className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 text-[13px]"
                    style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
                  >
                    이번 주 내 참석 상태
                    <AttendanceBadge status={myStatus} />
                    {myStatus === "PENDING" ? (
                      <Link
                        href={`/praise-team/setlists/${setlist.id}#attendance`}
                        className="underline underline-offset-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        지금 체크하기
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </PraiseCard>
            </>
          ) : (
            <StatePanel compact>
              <p>등록된 콘티가 아직 없습니다. 리더가 콘티를 올리면 이곳에 표시됩니다.</p>
              {isLeader ? (
                <Link
                  href="/praise-team/setlists/new"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-medium text-[var(--cta-fg)]"
                  style={{ background: "var(--cta-bg)" }}
                >
                  <PlusCircle size={14} aria-hidden />첫 콘티 작성하기
                </Link>
              ) : null}
            </StatePanel>
          )}

          {/* 최근 공지 + 다가오는 팀 일정 (2열) — 콘티/일정 유무와 무관하게 표시 */}
          {!loading && !error ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 최근 공지 */}
              <PraiseCard label="Notice" title="최근 공지">
                {notices.length > 0 ? (
                  <ul className="space-y-4">
                    {notices.map((notice) => (
                      <li key={notice.id} className="text-[14px]">
                        <p className="flex items-start gap-1.5 font-medium" style={{ color: "var(--foreground)" }}>
                          {notice.pinned ? (
                            <Pin size={13} aria-label="고정 공지" className="mt-1 shrink-0" style={{ color: "var(--accent-strong)" }} />
                          ) : (
                            <Megaphone size={13} aria-hidden className="mt-1 shrink-0" style={{ color: "var(--foreground-muted)" }} />
                          )}
                          {notice.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                          {notice.body}
                        </p>
                        <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                          {notice.author} · {formatDateLabel(notice.date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                    등록된 공지가 없습니다. 공지는 리더가 콘티에 함께 작성해요.
                  </p>
                )}
              </PraiseCard>

              {/* 다가오는 일정 */}
              <PraiseCard
                label="Schedule"
                title="다가오는 일정"
                action={
                  <Link
                    href="/praise-team/schedule"
                    className="text-[13px] underline underline-offset-2"
                    style={{ color: "var(--foreground-muted)" }}
                  >
                    전체 보기
                  </Link>
                }
              >
                {schedules.length > 0 ? (
                  <ul className="space-y-4">
                    {schedules.map((schedule) => (
                      <li key={schedule.id} className="text-[14px]">
                        <p className="flex flex-wrap items-center gap-2 font-medium" style={{ color: "var(--foreground)" }}>
                          <CalendarDays size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                          {schedule.title}
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px]"
                            style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                          >
                            {PRAISE_SCHEDULE_TYPE_LABELS[schedule.type] ?? schedule.type}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px]"
                            style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                          >
                            {SCHEDULE_VISIBILITY_LABELS[schedule.visibility] ?? schedule.visibility}
                          </span>
                        </p>
                        <p className="mt-1 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                          {formatDateLabel(scheduleDateKey(schedule.startAt))} {scheduleTimeLabel(schedule.startAt)}
                          {schedule.location ? ` · ${schedule.location}` : ""}
                        </p>
                        {schedule.setlistId ? (
                          <Link
                            href={`/praise-team/setlists/${schedule.setlistId}`}
                            className="mt-1 inline-flex min-h-8 items-center gap-1 text-[13px] underline underline-offset-2"
                            style={{ color: "var(--foreground)" }}
                          >
                            <ListMusic size={12} aria-hidden style={{ color: "var(--accent-strong)" }} />
                            콘티 보기
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                    다가오는 일정이 없습니다.{isLeader ? " 팀 일정 페이지에서 등록할 수 있어요." : ""}
                  </p>
                )}
              </PraiseCard>
            </div>
          ) : null}
        </div>
        </div>
      </PageShell>
    </>
  );
}
