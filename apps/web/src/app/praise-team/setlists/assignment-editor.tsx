"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Trash2, UserPlus } from "lucide-react";
import { ApiError, apiErrorMessage } from "@/lib/api";
import {
  fetchPraiseMembers,
  praisePartLabel,
  PRAISE_PARTS,
  PRAISE_ROLE_LABELS,
  savePraiseAssignments,
  type PraiseMember,
  type PraiseSetlist,
} from "@/data/praise-team";
import { AttendanceBadge, PraiseCard } from "../praise-ui";

type Row = {
  clientKey: string;
  userId: number | null;
  part: string;
};

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;

const selectClass =
  "rounded-xl border px-3 py-2.5 text-[13px] outline-none";
const selectStyle = {
  background: "var(--panel)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
} as const;

/**
 * 파트 배정 편집(리더 전용) — 팀원 목록에서 선택해 파트를 지정한다.
 * 저장은 전체 교체(PUT)지만 유지되는 (팀원, 파트) 조합의 참석 응답은 서버가 보존한다.
 */
export function AssignmentEditor({
  setlist,
  onSaved,
}: {
  setlist: PraiseSetlist;
  onSaved: (updated: PraiseSetlist) => void;
}) {
  const [members, setMembers] = useState<PraiseMember[] | null>(null);
  const [rows, setRows] = useState<Row[]>(
    setlist.assignments.map((assignment) => ({
      clientKey: nextKey(),
      userId: assignment.userId,
      part: assignment.part,
    })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPraiseMembers()
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          toast.error("팀원 목록을 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (saving) return;
    const filled = rows.filter((row) => row.userId != null);
    if (rows.length !== filled.length) {
      toast.error("팀원이 선택되지 않은 배정이 있습니다. 팀원을 선택하거나 줄을 삭제해 주세요.");
      return;
    }
    const seen = new Set<string>();
    for (const row of filled) {
      const dupKey = `${row.userId}:${row.part}`;
      if (seen.has(dupKey)) {
        toast.error("같은 팀원에게 같은 파트가 중복 배정되어 있습니다.");
        return;
      }
      seen.add(dupKey);
    }
    setSaving(true);
    try {
      const updated = await savePraiseAssignments(
        setlist.id,
        filled.map((row) => ({ userId: row.userId as number, part: row.part })),
      );
      onSaved(updated);
      toast.success("파트 배정을 저장했습니다.");
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? apiErrorMessage(e, "배정 저장에 실패했습니다.")
          : "배정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statusByUserPart = new Map(
    setlist.assignments.map((assignment) => [`${assignment.userId}:${assignment.part}`, assignment.status]),
  );

  return (
    <PraiseCard
      id="assignments"
      label="Team"
      title="파트 배정"
      action={
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [...prev, { clientKey: nextKey(), userId: null, part: PRAISE_PARTS[1] }])
          }
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <UserPlus size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />
          배정 추가
        </button>
      }
    >
      {members === null ? (
        <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          팀원 목록을 불러오는 중입니다…
        </p>
      ) : members.length === 0 ? (
        <p className="text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          찬양팀으로 지정된 회원이 없습니다. 관리자 페이지(회원 관리)에서 회원에게 찬양팀
          역할·파트를 먼저 지정해 주세요.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          아직 배정이 없습니다. “배정 추가”로 팀원을 배정해 주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const status = row.userId != null ? statusByUserPart.get(`${row.userId}:${row.part}`) : undefined;
            return (
              <li key={row.clientKey} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.userId ?? ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.clientKey === row.clientKey
                          ? { ...r, userId: e.target.value ? Number(e.target.value) : null }
                          : r,
                      ),
                    )
                  }
                  aria-label={`${index + 1}번 배정 팀원`}
                  className={`${selectClass} min-w-0 flex-1`}
                  style={selectStyle}
                >
                  <option value="">팀원 선택…</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({PRAISE_ROLE_LABELS[member.praiseRole]}
                      {member.praiseParts.length > 0
                        ? ` · ${member.praiseParts.map(praisePartLabel).join(", ")}`
                        : ""}
                      )
                    </option>
                  ))}
                </select>
                <select
                  value={row.part}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.clientKey === row.clientKey ? { ...r, part: e.target.value } : r)),
                    )
                  }
                  aria-label={`${index + 1}번 배정 파트`}
                  className={`${selectClass} w-36`}
                  style={selectStyle}
                >
                  {PRAISE_PARTS.map((part) => (
                    <option key={part} value={part}>
                      {praisePartLabel(part)}
                    </option>
                  ))}
                </select>
                {status ? <AttendanceBadge status={status} /> : null}
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.clientKey !== row.clientKey))}
                  aria-label={`${index + 1}번 배정 삭제`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {members !== null && members.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium disabled:opacity-60"
          >
            <Save size={14} aria-hidden />
            {saving ? "저장 중…" : "배정 저장"}
          </button>
          <p className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
            유지된 배정의 참석 응답은 그대로 보존됩니다.
          </p>
        </div>
      ) : null}
    </PraiseCard>
  );
}
