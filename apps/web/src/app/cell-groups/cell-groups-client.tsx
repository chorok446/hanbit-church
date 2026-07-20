"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Loader2, MapPin, PlusCircle, Users } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { isCellGroupManager } from "@/app/admin/permissions";
import {
  createCellGroup,
  fetchCellGroups,
  type CellGroupSummary,
} from "@/data/cell-groups";
import { useCellProfile } from "./cell-group-guard";
import { CellBand, CellCard } from "./cell-groups-ui";

/** 목장 디렉터리 — 모든 교인이 활성 목장을 둘러보고, 매니저는 비활성 포함 전체 + 새 목장 생성. */
export function CellGroupsDirectory() {
  const profile = useCellProfile();
  const canManage = isCellGroupManager(profile.role);

  const [groups, setGroups] = useState<CellGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const retry = () => {
    setGroups(null);
    setError(null);
    setRetryTick((t) => t + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchCellGroups()
      .then((list) => {
        if (!cancelled) setGroups(list);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? apiErrorMessage(e, "목장 목록을 불러오지 못했습니다.") : "목장 목록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  return (
    <>
      <CellBand
        eyebrow="Cell Groups"
        title="목장"
        subtitle="구역별 목장 명단과 모임 일정·나눔 기록을 한곳에서 관리합니다."
      />
      <PageShell orb="right" paddingClassName="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-[896px] space-y-6">
          {canManage ? <CreateGroupForm onCreated={() => setRetryTick((t) => t + 1)} /> : null}

          <CellCard
            label="Directory"
            title="목장 목록"
            action={
              groups ? (
                <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                  {groups.length}개 목장
                </span>
              ) : null
            }
          >
            {groups === null && !error ? (
              <p className="inline-flex items-center gap-2 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                <Loader2 className="animate-spin" size={16} aria-hidden />
                불러오는 중입니다…
              </p>
            ) : error ? (
              <StatePanel>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full border px-4 py-2 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  다시 시도
                </button>
              </StatePanel>
            ) : groups && groups.length === 0 ? (
              <p className="text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
                아직 등록된 목장이 없습니다.
                {canManage ? " 위 “새 목장”에서 목장을 만들어 주세요." : " 목장이 등록되면 여기에 표시됩니다."}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {(groups ?? []).map((group) => (
                  <li key={group.id}>
                    <Link
                      href={`/cell-groups/${group.id}`}
                      className="card-lift flex items-center gap-3 rounded-2xl border p-4"
                      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-[16px]"
                            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                          >
                            {group.name}
                          </span>
                          {group.mine ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                            >
                              내 목장
                            </span>
                          ) : null}
                          {!group.active ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                            >
                              비활성
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"
                          style={{ color: "var(--foreground-muted)" }}
                        >
                          {group.district ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                              {group.district}
                            </span>
                          ) : null}
                          {group.leaderName ? <span>리더 {group.leaderName}</span> : null}
                          <span className="inline-flex items-center gap-1">
                            <Users size={13} aria-hidden />
                            {group.memberCount}명
                          </span>
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden style={{ color: "var(--foreground-muted)" }} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CellCard>
        </div>
      </PageShell>
    </>
  );
}

/** 새 목장 생성(매니저 전용) — 이름·구역·설명만. 리더·로스터는 상세에서 지정. */
function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    background: "var(--panel)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  } as const;

  const submit = async () => {
    if (saving) return;
    if (!name.trim()) {
      toast.error("목장 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const created = await createCellGroup({
        name: name.trim(),
        district: district.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success(`'${created.name}' 목장을 만들었습니다.`);
      setName("");
      setDistrict("");
      setDescription("");
      setOpen(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "목장 생성에 실패했습니다.") : "목장 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-[13px] font-medium"
      >
        <PlusCircle size={15} aria-hidden />새 목장
      </button>
    );
  }

  return (
    <CellCard label="New" title="새 목장 만들기">
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="목장 이름 (예: 주은 목장)"
          aria-label="목장 이름"
          className="w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none"
          style={inputStyle}
        />
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="구역 (예: 1구역) — 선택"
          aria-label="구역"
          className="w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none"
          style={inputStyle}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="목장 소개 — 선택"
          aria-label="목장 소개"
          rows={2}
          className="w-full rounded-xl border px-3 py-2.5 text-[14px] outline-none"
          style={inputStyle}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="cta-solid inline-flex min-h-11 items-center rounded-full px-6 text-[13px] font-medium disabled:opacity-60"
          >
            {saving ? "만드는 중…" : "목장 만들기"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center rounded-full border px-5 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            취소
          </button>
        </div>
      </div>
    </CellCard>
  );
}
