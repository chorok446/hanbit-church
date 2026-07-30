"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarPlus,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { ApiError, apiErrorMessage } from "@/lib/api";
import {
  attendanceStyle,
  attendanceSummary,
  CELL_ATTENDANCE_LABELS,
  CELL_ATTENDANCE_STATUSES,
  CELL_MEMBER_ROLE_LABELS,
  createCellMeeting,
  deleteCellGroup,
  deleteCellMeeting,
  fetchCellGroup,
  meetingWhenLabel,
  saveCellGroupMembers,
  searchCellCandidates,
  toDateInputValue,
  toInstant,
  toTimeInputValue,
  updateCellGroup,
  updateCellMeeting,
  type CellAttendanceStatus,
  type CellGroupDetail,
  type CellMeeting,
  type CellMemberRole,
} from "@/data/cell-groups";
import { CellBand, CellCard } from "../cell-groups-ui";

const inputStyle = {
  background: "var(--panel)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
} as const;
const inputClass = "w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none";

export function CellGroupDetailClient({ groupId }: { groupId: string }) {
  const [detail, setDetail] = useState<CellGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchCellGroup(groupId)
      .then((d) => {
        if (cancelled) return;
        setError(null);
        setDetail(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          setForbidden(true);
          return;
        }
        setError(e instanceof ApiError ? apiErrorMessage(e, "목장을 불러오지 못했습니다.") : "목장을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, reloadTick]);

  if (forbidden) {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          <p
            className="text-[18px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            목장원 전용 페이지입니다
          </p>
          <p className="max-w-[40ch] leading-7" style={{ color: "var(--foreground-muted)" }}>
            이 목장의 상세는 소속 목장원·리더·담당 스태프만 볼 수 있습니다. 접근이 필요하면 목장
            리더나 관리자에게 문의해 주세요.
          </p>
          <Link
            href="/cell-groups"
            className="rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            목장 목록으로
          </Link>
        </StatePanel>
      </PageShell>
    );
  }

  if (!detail) {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          {error ? (
            <>
              <p>{error}</p>
              <button
                type="button"
                onClick={reload}
                className="rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>불러오는 중입니다…</p>
            </>
          )}
        </StatePanel>
      </PageShell>
    );
  }

  return (
    <>
      <CellBand
        eyebrow={detail.district ? `Cell Group · ${detail.district}` : "Cell Group"}
        title={detail.name}
        subtitle={detail.leaderName ? `리더 ${detail.leaderName} · 목장원 ${detail.members.length}명` : `목장원 ${detail.members.length}명`}
        back={{ href: "/cell-groups", label: "목장 목록" }}
      />
      <PageShell orb="right" paddingClassName="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-[896px] space-y-6">
          <InfoCard detail={detail} onChanged={reload} />
          <RosterCard detail={detail} onChanged={reload} />
          <MeetingsCard detail={detail} onChanged={reload} />
        </div>
      </PageShell>
    </>
  );
}

// ─── 정보 ───

function InfoCard({ detail, onChanged }: { detail: CellGroupDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(detail.name);
  const [district, setDistrict] = useState(detail.district ?? "");
  const [description, setDescription] = useState(detail.description ?? "");
  const [leaderUserId, setLeaderUserId] = useState<number | null>(detail.leaderUserId ?? null);
  const [active, setActive] = useState(detail.active);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      toast.error("목장 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateCellGroup(detail.id, {
        name: name.trim(),
        district: district.trim() || undefined,
        description: description.trim() || undefined,
        // 매니저만 반영됨(서버가 판정). 리더가 보내도 무시된다.
        leaderUserId: detail.canManageRoster ? leaderUserId : undefined,
        active: detail.canManageRoster ? active : undefined,
      });
      toast.success("목장 정보를 저장했습니다.");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "저장에 실패했습니다.") : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`'${detail.name}' 목장을 삭제하시겠습니까? 로스터와 모임 기록이 모두 삭제됩니다.`)) return;
    try {
      await deleteCellGroup(detail.id);
      toast.success("목장을 삭제했습니다.");
      window.location.href = "/cell-groups";
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "삭제에 실패했습니다.") : "삭제에 실패했습니다.");
    }
  };

  if (!editing) {
    return (
      <CellCard
        label="Info"
        title="목장 정보"
        action={
          detail.canManage ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Pencil size={13} aria-hidden />
              수정
            </button>
          ) : null
        }
      >
        <dl className="space-y-2 text-[14px]" style={{ color: "var(--foreground)" }}>
          {detail.district ? (
            <div className="flex gap-2">
              <dt style={{ color: "var(--foreground-muted)" }}>구역</dt>
              <dd className="inline-flex items-center gap-1">
                <MapPin size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                {detail.district}
              </dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt style={{ color: "var(--foreground-muted)" }}>리더</dt>
            <dd>{detail.leaderName ?? "미지정"}</dd>
          </div>
        </dl>
        {detail.description ? (
          <p className="pt-3 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
            {detail.description}
          </p>
        ) : null}
        {!detail.active ? (
          <p className="pt-3 text-[13px]" style={{ color: "var(--danger)" }}>
            비활성 목장 — 일반 목록에서는 숨겨집니다.
          </p>
        ) : null}
      </CellCard>
    );
  }

  return (
    <CellCard label="Info" title="목장 정보 수정">
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="목장 이름"
          className={inputClass}
          style={inputStyle}
        />
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="구역 — 선택"
          aria-label="구역"
          className={inputClass}
          style={inputStyle}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="목장 소개 — 선택"
          aria-label="목장 소개"
          rows={2}
          className={inputClass}
          style={inputStyle}
        />
        {detail.canManageRoster ? (
          <>
            <label className="block text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              리더 (로스터에서 선택)
              <select
                value={leaderUserId ?? ""}
                onChange={(e) => setLeaderUserId(e.target.value ? Number(e.target.value) : null)}
                className={`${inputClass} mt-1`}
                style={inputStyle}
              >
                <option value="">미지정</option>
                {detail.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              활성 목장(목록에 노출)
            </label>
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setEditing(false)}
            className="inline-flex min-h-11 items-center rounded-full border px-5 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            취소
          </button>
          {detail.canManageRoster ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 text-[13px] sm:ml-auto"
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
            >
              <Trash2 size={13} aria-hidden />
              목장 삭제
            </button>
          ) : null}
        </div>
      </div>
    </CellCard>
  );
}

// ─── 로스터 ───

type RosterRow = { userId: number; name: string; role: CellMemberRole };

function RosterCard({ detail, onChanged }: { detail: CellGroupDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);

  if (!detail.canManageRoster) {
    return (
      <CellCard label="Roster" title="목장원" action={<span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>{detail.members.length}명</span>}>
        {detail.members.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            아직 등록된 목장원이 없습니다.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {detail.members.map((m) => (
              <li
                key={m.userId}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {m.name}
                {m.role === "LEADER" ? (
                  <span className="text-[11px]" style={{ color: "var(--accent-strong)" }}>
                    {CELL_MEMBER_ROLE_LABELS.LEADER}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CellCard>
    );
  }

  return (
    <CellCard
      label="Roster"
      title="목장원"
      action={
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <Users size={13} aria-hidden />
          {editing ? "닫기" : "명단 관리"}
        </button>
      }
    >
      {editing ? (
        <RosterEditor detail={detail} onSaved={() => { setEditing(false); onChanged(); }} />
      ) : detail.members.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          아직 등록된 목장원이 없습니다. “명단 관리”에서 목장원을 추가해 주세요.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {detail.members.map((m) => (
            <li
              key={m.userId}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {m.name}
              {m.role === "LEADER" ? (
                <span className="text-[11px]" style={{ color: "var(--accent-strong)" }}>
                  {CELL_MEMBER_ROLE_LABELS.LEADER}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </CellCard>
  );
}

/** 로스터 전체 교체 편집(매니저) — 후보 검색으로 추가, 역할 변경·삭제 후 한 번에 저장. */
function RosterEditor({ detail, onSaved }: { detail: CellGroupDetail; onSaved: () => void }) {
  const [rows, setRows] = useState<RosterRow[]>(
    detail.members.map((m) => ({ userId: m.userId, name: m.name, role: m.role })),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchSeq = useRef(0);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const found = await searchCellCandidates(q);
      if (seq === searchSeq.current) setResults(found);
    } catch {
      if (seq === searchSeq.current) toast.error("회원 검색에 실패했습니다.");
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  const add = (candidate: { id: number; name: string }) => {
    if (rows.some((r) => r.userId === candidate.id)) {
      toast.info("이미 명단에 있는 회원입니다.");
      return;
    }
    setRows((prev) => [...prev, { userId: candidate.id, name: candidate.name, role: "MEMBER" }]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveCellGroupMembers(
        detail.id,
        rows.map((r) => ({ userId: r.userId, role: r.role })),
      );
      toast.success("목장원 명단을 저장했습니다.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "명단 저장에 실패했습니다.") : "명단 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          아직 목장원이 없습니다. 아래에서 회원을 검색해 추가하세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.userId} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[14px]" style={{ color: "var(--foreground)" }}>
                {row.name}
              </span>
              <select
                value={row.role}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.userId === row.userId ? { ...r, role: e.target.value as CellMemberRole } : r)),
                  )
                }
                aria-label={`${row.name} 역할`}
                className="rounded-xl border px-3 py-2 text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="MEMBER">{CELL_MEMBER_ROLE_LABELS.MEMBER}</option>
                <option value="LEADER">{CELL_MEMBER_ROLE_LABELS.LEADER}</option>
              </select>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((r) => r.userId !== row.userId))}
                aria-label={`${row.name} 삭제`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", color: "var(--danger)" }}
              >
                <X size={14} aria-hidden />
              </button>
              <span className="sr-only">{index + 1}번</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="회원 이름으로 검색해 추가"
            aria-label="회원 검색"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <Search size={14} aria-hidden />
            검색
          </button>
        </div>
        {searching ? (
          <p className="mt-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>검색 중…</p>
        ) : results.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => add(c)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px] transition-colors hover:bg-[var(--panel)]"
                  style={{ color: "var(--foreground)" }}
                >
                  <UserPlus size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium disabled:opacity-60"
      >
        <Save size={14} aria-hidden />
        {saving ? "저장 중…" : "명단 저장"}
      </button>
    </div>
  );
}

// ─── 모임(스케줄·기록) ───

function MeetingsCard({ detail, onChanged }: { detail: CellGroupDetail; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <CellCard
      label="Meetings"
      title="모임 · 나눔 기록"
      action={
        detail.canManage ? (
          <button
            type="button"
            onClick={() => {
              setAdding((v) => !v);
              setEditingId(null);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <CalendarPlus size={13} aria-hidden />
            {adding ? "닫기" : "모임 추가"}
          </button>
        ) : null
      }
    >
      <div className="space-y-3">
        {adding ? (
          <MeetingForm
            detail={detail}
            onSaved={() => {
              setAdding(false);
              onChanged();
            }}
            onCancel={() => setAdding(false)}
          />
        ) : null}

        {detail.meetings.length === 0 && !adding ? (
          <p className="text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
            아직 모임 기록이 없습니다.
            {detail.canManage ? " “모임 추가”로 모임 일정과 참석·나눔을 기록해 보세요." : ""}
          </p>
        ) : null}

        {detail.meetings.map((meeting) =>
          editingId === meeting.id ? (
            <MeetingForm
              key={meeting.id}
              detail={detail}
              meeting={meeting}
              onSaved={() => {
                setEditingId(null);
                onChanged();
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <MeetingRow
              key={meeting.id}
              detail={detail}
              meeting={meeting}
              onEdit={() => {
                setEditingId(meeting.id);
                setAdding(false);
              }}
              onChanged={onChanged}
            />
          ),
        )}
      </div>
    </CellCard>
  );
}

function MeetingRow({
  detail,
  meeting,
  onEdit,
  onChanged,
}: {
  detail: CellGroupDetail;
  meeting: CellMeeting;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const summary = attendanceSummary(meeting.attendance);
  const remove = async () => {
    if (!window.confirm("이 모임 기록을 삭제하시겠습니까?")) return;
    try {
      await deleteCellMeeting(detail.id, meeting.id);
      toast.success("모임을 삭제했습니다.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "삭제에 실패했습니다.") : "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
            {meeting.title}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            {meetingWhenLabel(meeting.meetAt)}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
        </div>
        {detail.canManage ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              aria-label="모임 수정"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Pencil size={13} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              aria-label="모임 삭제"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      {meeting.agenda ? (
        <p className="mt-2 text-[14px] leading-7" style={{ color: "var(--foreground)" }}>
          {meeting.agenda}
        </p>
      ) : null}
      {summary ? (
        <p className="mt-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          참석 · {summary}
        </p>
      ) : null}
      {meeting.attendance.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {meeting.attendance.map((a) => (
            <li
              key={a.userId}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={attendanceStyle(a.status)}
            >
              {a.name} · {CELL_ATTENDANCE_LABELS[a.status]}
            </li>
          ))}
        </ul>
      ) : null}
      {meeting.sharingNote ? (
        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent-strong)" }}>
            나눔
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[14px] leading-7" style={{ color: "var(--foreground)" }}>
            {meeting.sharingNote}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 모임 생성/수정 폼 — 스케줄 + 참석(로스터 기준) + 나눔. */
function MeetingForm({
  detail,
  meeting,
  onSaved,
  onCancel,
}: {
  detail: CellGroupDetail;
  meeting?: CellMeeting;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(meeting ? toDateInputValue(meeting.meetAt) : "");
  const [time, setTime] = useState(meeting ? toTimeInputValue(meeting.meetAt) : "19:30");
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [sharingNote, setSharingNote] = useState(meeting?.sharingNote ?? "");
  const [attendance, setAttendance] = useState<Record<number, CellAttendanceStatus | "">>(() => {
    const map: Record<number, CellAttendanceStatus | ""> = {};
    for (const a of meeting?.attendance ?? []) map[a.userId] = a.status;
    return map;
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!title.trim()) {
      toast.error("모임 제목을 입력해 주세요.");
      return;
    }
    const meetAt = toInstant(date, time);
    if (!meetAt) {
      toast.error("모임 날짜를 선택해 주세요.");
      return;
    }
    const attendanceList = detail.members
      .map((m) => ({ userId: m.userId, status: attendance[m.userId] }))
      .filter((a): a is { userId: number; status: CellAttendanceStatus } => a.status !== "" && a.status != null);
    const input = {
      title: title.trim(),
      meetAt,
      location: location.trim() || undefined,
      agenda: agenda.trim() || undefined,
      sharingNote: sharingNote.trim() || undefined,
      attendance: attendanceList,
    };
    setSaving(true);
    try {
      if (meeting) await updateCellMeeting(detail.id, meeting.id, input);
      else await createCellMeeting(detail.id, input);
      toast.success(meeting ? "모임을 수정했습니다." : "모임을 추가했습니다.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "저장에 실패했습니다.") : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="모임 제목 (예: 7월 첫째 주 목장 모임)"
          aria-label="모임 제목"
          className={inputClass}
          style={inputStyle}
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="모임 날짜"
            className="rounded-xl border px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="모임 시간"
            className="rounded-xl border px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="장소 — 선택"
            aria-label="장소"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
        </div>
        <textarea
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="모임 주제·안내 — 선택"
          aria-label="모임 주제"
          rows={2}
          className={inputClass}
          style={inputStyle}
        />

        {detail.members.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
              참석 체크
            </p>
            <ul className="space-y-1.5">
              {detail.members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-[14px]" style={{ color: "var(--foreground)" }}>
                    {m.name}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAttendance((prev) => ({ ...prev, [m.userId]: "" }))}
                      className="rounded-full border px-3 py-1.5 text-[12px]"
                      style={{
                        borderColor: "var(--border)",
                        color: !attendance[m.userId] ? "var(--heading)" : "var(--foreground-muted)",
                        background: !attendance[m.userId] ? "var(--chip-bg)" : "transparent",
                      }}
                    >
                      미기록
                    </button>
                    {CELL_ATTENDANCE_STATUSES.map((status) => {
                      const selected = attendance[m.userId] === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAttendance((prev) => ({ ...prev, [m.userId]: status }))}
                          className="rounded-full border px-3 py-1.5 text-[12px]"
                          style={
                            selected
                              ? attendanceStyle(status)
                              : { borderColor: "var(--border)", color: "var(--foreground-muted)" }
                          }
                        >
                          {CELL_ATTENDANCE_LABELS[status]}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            로스터에 목장원이 없어 참석 체크는 명단 등록 후 가능합니다.
          </p>
        )}

        <textarea
          value={sharingNote}
          onChange={(e) => setSharingNote(e.target.value)}
          placeholder="나눔 기록 — 모임에서 나눈 내용을 자유롭게 남겨 주세요"
          aria-label="나눔 기록"
          rows={4}
          className={inputClass}
          style={inputStyle}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium disabled:opacity-60"
          >
            <Save size={14} aria-hidden />
            {saving ? "저장 중…" : meeting ? "모임 수정" : "모임 저장"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center rounded-full border px-5 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
