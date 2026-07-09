"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  Pin,
  Trash2,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { formatDateLabel } from "@/data/calendar";
import { ApiError } from "@/lib/api";
import {
  ATTENDANCE_STATUS_LABELS,
  attendanceStatusStyle,
  deletePraiseSetlist,
  fetchPraiseSetlist,
  isImageUrl,
  isPdfUrl,
  praisePartLabel,
  remindPendingAttendance,
  PRAISE_SONG_TYPE_LABELS,
  saveMyAttendance,
  sortPraiseNotices,
  type PraiseAssignment,
  type PraiseAttendanceStatus,
  type PraisePart,
  type PraiseSetlist,
  type PraiseSetlistSong,
} from "@/data/praise-team";
import { usePraiseProfile } from "../../praise-team-guard";
import { AttendanceBadge, PraiseCard, SetlistStatusBadge } from "../../praise-ui";

const CHECKABLE_STATUSES: Exclude<PraiseAttendanceStatus, "PENDING">[] = [
  "AVAILABLE",
  "LATE",
  "UNAVAILABLE",
];

type Result = { key: string; error: string | null; setlist: PraiseSetlist | null };

/** 콘티 상세(P1) — 백엔드 /api/praise 실데이터. 참석 체크는 서버에 저장돼 팀 전체에 공유된다. */
export function SetlistDetailClient({ setlistId }: { setlistId: string }) {
  const profile = usePraiseProfile();
  const router = useRouter();

  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reminding, setReminding] = useState(false);

  const requestKey = `${setlistId}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchPraiseSetlist(setlistId)
      .then((setlist) => {
        if (!cancelled) setResult({ key: requestKey, error: null, setlist });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          setlist: null,
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "콘티를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [setlistId, requestKey]);

  const loading = result === null || result.key !== requestKey;
  const error = loading ? null : result.error;
  const setlist = loading ? null : result.setlist;

  // 리더·사이트 관리자에게만 관리 버튼을 노출한다(서버도 같은 기준으로 재검사).
  const isLeader = profile.praiseRole === "LEADER" || profile.role === "ADMIN";
  const myParts = (profile.praiseParts ?? []) as PraisePart[];
  const pendingCount = setlist?.assignments.filter((a) => a.status === "PENDING").length ?? 0;

  const sendReminder = async () => {
    if (!setlist || reminding) return;
    setReminding(true);
    try {
      const { remindedCount } = await remindPendingAttendance(setlist.id);
      toast.success(
        remindedCount > 0
          ? `미응답자 ${remindedCount}명에게 참석 리마인드를 보냈습니다.`
          : "리마인드를 보낼 미응답자가 없습니다.",
      );
    } catch {
      toast.error("리마인드 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setReminding(false);
    }
  };

  const remove = async () => {
    if (!setlist || deleting) return;
    if (!window.confirm("이 콘티를 삭제할까요? 배정·참석 응답도 함께 삭제됩니다.")) return;
    setDeleting(true);
    try {
      await deletePraiseSetlist(setlist.id);
      toast.success("콘티를 삭제했습니다.");
      router.replace("/praise-team/setlists");
    } catch {
      toast.error("콘티 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDeleting(false);
    }
  };

  if (loading || error) {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          {error ? (
            <>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>콘티를 불러오는 중입니다…</p>
            </>
          )}
        </StatePanel>
      </PageShell>
    );
  }

  if (!setlist) {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          <p>콘티를 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있어요.</p>
          <Link
            href="/praise-team"
            className="rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            찬양팀 홈으로
          </Link>
        </StatePanel>
      </PageShell>
    );
  }

  const notices = sortPraiseNotices(setlist.notices);
  const myAssignments = setlist.assignments.filter((a) => a.userId === profile.id);

  return (
    <PageShell orb="right" paddingClassName="px-6 pb-24 pt-32">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/praise-team"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px]"
          style={{ color: "var(--foreground-muted)" }}
        >
          <ArrowLeft size={14} aria-hidden />
          찬양팀 홈
        </Link>

        <div className="mt-4 space-y-6">
          {/* 예배 정보 */}
          <PraiseCard
            label="Setlist"
            title={`${formatDateLabel(setlist.worshipDate)} ${setlist.worshipType}`}
            action={<SetlistStatusBadge status={setlist.status} />}
          >
            <p className="text-[14px]" style={{ color: "var(--foreground)" }}>
              {setlist.title}
            </p>
            <div
              className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]"
              style={{ color: "var(--foreground-muted)" }}
            >
              {setlist.serviceTime ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  {setlist.serviceTime}
                </span>
              ) : null}
              {setlist.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  {setlist.location}
                </span>
              ) : null}
            </div>
            {setlist.rehearsalTime ? (
              <p className="mt-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                리허설: {setlist.rehearsalTime}
              </p>
            ) : null}
            {isLeader ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/praise-team/setlists/${setlist.id}/edit`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <Pencil size={14} aria-hidden />
                  콘티 수정
                </Link>
                <Link
                  href={`/praise-team/setlists/${setlist.id}/edit#assignments`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <Users size={14} aria-hidden />
                  배정 관리
                </Link>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={deleting}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 text-[13px] disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                >
                  <Trash2 size={14} aria-hidden />
                  {deleting ? "삭제 중…" : "삭제"}
                </button>
              </div>
            ) : null}
          </PraiseCard>

          {/* 곡 순서 */}
          <PraiseCard label="Songs" title="곡 순서">
            {setlist.songs.length > 0 ? (
              <ol className="space-y-5">
                {setlist.songs.map((song) => (
                  <SongItem key={song.id} song={song} myParts={myParts} />
                ))}
              </ol>
            ) : (
              <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                아직 곡이 없습니다. {isLeader ? "콘티 수정에서 곡을 추가해 주세요." : "리더가 곡을 추가하면 표시됩니다."}
              </p>
            )}
          </PraiseCard>

          {/* 파트 배정 · 참석 현황 */}
          <PraiseCard
            label="Team"
            title="파트 배정"
            action={
              isLeader && pendingCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void sendReminder()}
                  disabled={reminding}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] disabled:opacity-60"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <BellRing size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  {reminding ? "발송 중…" : `미응답 ${pendingCount}명 리마인드`}
                </button>
              ) : null
            }
          >
            {setlist.assignments.length > 0 ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {setlist.assignments.map((assignment) => (
                  <AssignmentItem
                    key={assignment.id}
                    assignment={assignment}
                    mine={assignment.userId === profile.id}
                    showMemo={isLeader}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                아직 배정된 팀원이 없습니다.{" "}
                {isLeader ? "배정 관리에서 팀원을 배정해 주세요." : "리더가 배정하면 표시됩니다."}
              </p>
            )}
          </PraiseCard>

          {/* 내 참석 체크 — 서버 저장(팀 전체 공유) */}
          <MyAttendanceCard
            setlistId={setlist.id}
            myAssignments={myAssignments}
            onSaved={(rows) =>
              setResult((prev) =>
                prev?.setlist
                  ? {
                      ...prev,
                      setlist: {
                        ...prev.setlist,
                        assignments: prev.setlist.assignments.map(
                          (a) => rows.find((row) => row.id === a.id) ?? a,
                        ),
                      },
                    }
                  : prev,
              )
            }
          />

          {/* 공지 */}
          <PraiseCard label="Notice" title="공지">
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
                    <p className="mt-1 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
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
                등록된 공지가 없습니다.
              </p>
            )}
          </PraiseCard>
        </div>
      </div>
    </PageShell>
  );
}

function AssignmentItem({
  assignment,
  mine,
  showMemo,
}: {
  assignment: PraiseAssignment;
  mine: boolean;
  /** 리더에게는 참석 메모(지각 사유 등)까지 보여준다. */
  showMemo: boolean;
}) {
  return (
    <li
      className="rounded-2xl border px-4 py-3"
      style={{
        background: mine ? "var(--accent-soft)" : "var(--panel)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-20 shrink-0 text-[12px] font-semibold"
          style={{ color: "var(--accent-strong)" }}
        >
          {praisePartLabel(assignment.part)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: "var(--foreground)" }}>
          {assignment.name}
          {mine ? " (나)" : ""}
        </span>
        <AttendanceBadge status={assignment.status} />
      </div>
      {showMemo && assignment.memo ? (
        <p className="mt-1.5 pl-24 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          메모: {assignment.memo}
        </p>
      ) : null}
    </li>
  );
}

function SongItem({ song, myParts }: { song: PraiseSetlistSong; myParts: PraisePart[] }) {
  const partNotes = Object.entries(song.partNotes ?? {}) as [PraisePart, string][];
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums"
        style={{ background: "var(--chip-bg)", color: "var(--heading)" }}
      >
        {song.order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="text-[17px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            {song.title}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={
              song.type === "praise"
                ? { background: "var(--accent-soft)", color: "var(--accent-strong)" }
                : { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--heading)" }
            }
          >
            {PRAISE_SONG_TYPE_LABELS[song.type]}
          </span>
        </div>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          {song.key} Key · {song.bpm}BPM
        </p>
        {song.links.length > 0 ? (
          <>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {song.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center gap-1 text-[13px] underline underline-offset-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {isPdfUrl(link.url) ? (
                    // PDF 는 /uploads 가 Content-Disposition: attachment 로 서빙 → 클릭 = 다운로드.
                    <FileText size={12} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  ) : (
                    <ExternalLink size={12} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  )}
                  {link.label}
                </a>
              ))}
            </p>
            {/* 업로드된 악보 사진은 인라인 미리보기 — 클릭하면 원본을 새 탭으로 연다. */}
            {song.links.some((link) => isImageUrl(link.url)) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {song.links
                  .filter((link) => isImageUrl(link.url))
                  .map((link) => (
                    <a
                      key={`preview-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${link.label} 원본 새 탭으로 열기`}
                      className="block overflow-hidden rounded-2xl border"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 서버(8080)의 동적 이미지라 next/image 도메인 최적화 대상이 아니다 */}
                      <img
                        src={link.url}
                        alt={link.label}
                        loading="lazy"
                        className="h-40 w-auto max-w-full object-contain"
                        style={{ background: "var(--panel)" }}
                      />
                    </a>
                  ))}
              </div>
            ) : null}
          </>
        ) : null}
        {song.note ? (
          <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
            {song.note}
          </p>
        ) : null}
        {partNotes.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {partNotes.map(([part, note]) => {
              const mine = myParts.includes(part);
              return (
                <li
                  key={part}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-xl px-2.5 py-1.5 text-[13px]"
                  style={mine ? { background: "var(--accent-soft)" } : undefined}
                >
                  <span className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                    {praisePartLabel(part)}
                    {mine ? " (내 파트)" : ""}
                  </span>
                  <span style={{ color: mine ? "var(--foreground)" : "var(--foreground-muted)" }}>
                    {note}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/**
 * 내 참석 체크 — PATCH /api/praise/setlists/{id}/attendance 로 서버에 저장한다.
 * 본인 배정이 없으면 폼 대신 안내를 보여준다(서버도 404 로 거절).
 */
function MyAttendanceCard({
  setlistId,
  myAssignments,
  onSaved,
}: {
  setlistId: string;
  myAssignments: PraiseAssignment[];
  onSaved: (rows: PraiseAssignment[]) => void;
}) {
  const saved = myAssignments[0] ?? null;
  const [status, setStatus] = useState<PraiseAttendanceStatus>(saved?.status ?? "PENDING");
  const [note, setNote] = useState(saved?.memo ?? "");
  const [saving, setSaving] = useState(false);

  if (!saved) {
    return (
      <PraiseCard id="attendance" label="Attendance" title="내 참석 체크">
        <p className="text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          아직 이 콘티에 배정되지 않아 참석 체크를 할 수 없습니다. 배정이 필요하면 찬양팀
          리더에게 문의해 주세요.
        </p>
      </PraiseCard>
    );
  }

  const save = async () => {
    if (saving) return;
    if (status === "PENDING") {
      toast.error("참석·지각·불참 중 하나를 먼저 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const rows = await saveMyAttendance(setlistId, { status, memo: note });
      onSaved(rows);
      toast.success(`참석 여부를 "${ATTENDANCE_STATUS_LABELS[status]}"(으)로 저장했습니다.`);
    } catch {
      toast.error("참석 여부 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PraiseCard
      id="attendance"
      label="Attendance"
      title="내 참석 체크"
      action={<AttendanceBadge status={status} />}
    >
      <div className="grid grid-cols-3 gap-2">
        {CHECKABLE_STATUSES.map((option) => {
          const selected = status === option;
          const selectedStyle = attendanceStatusStyle(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => setStatus(option)}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border text-[14px] font-medium"
              style={
                selected
                  ? { ...selectedStyle, borderColor: "var(--accent)" }
                  : {
                      background: "var(--panel)",
                      borderColor: "var(--border)",
                      color: "var(--foreground-muted)",
                    }
              }
            >
              {selected ? <Check size={14} aria-hidden /> : null}
              {ATTENDANCE_STATUS_LABELS[option]}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={200}
        rows={2}
        placeholder="메모 (선택 — 예: 2부 시작 직전 도착 예정)"
        className="mt-3 w-full resize-none rounded-2xl border px-4 py-3 text-[14px] outline-none placeholder:opacity-50"
        style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--foreground)" }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium text-[var(--cta-fg)] disabled:opacity-60"
          style={{ background: "var(--cta-bg)" }}
        >
          <ClipboardCheck size={14} aria-hidden />
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
      <p className="mt-3 text-[12px] leading-5" style={{ color: "var(--foreground-muted)" }}>
        저장한 참석 여부는 팀 전체에 공유됩니다. 지각·불참 사유는 메모로 함께 남겨주세요.
      </p>
    </PraiseCard>
  );
}
