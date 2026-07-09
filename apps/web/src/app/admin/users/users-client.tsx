"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, Music, Search, ShieldBan, ShieldCheck, BadgeCheck, UserCog } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { useAdminProfile } from "@/app/admin/admin-guard";
import { USER_ROLE_LABELS } from "@/app/admin/permissions";
import {
  fetchAdminUsers,
  setAdminUserRole,
  setAdminUserSuspension,
  setPraiseRole,
  type AdminUserItem,
  type AdminUsersPageResponse,
} from "@/data/admin";
import {
  PRAISE_PARTS,
  PRAISE_PART_LABELS,
  PRAISE_ROLE_LABELS,
  type PraiseTeamRole,
} from "@/data/praise-team";

const PAGE_SIZE = 20;

const FILTER_TABS: { id: "" | "suspended"; label: string }[] = [
  { id: "", label: "전체" },
  { id: "suspended", label: "정지 중" },
];

const SUSPEND_OPTIONS: { label: string; days: number | null }[] = [
  { label: "1일", days: 1 },
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "영구", days: null }, // 100년 뒤로 설정 → 사실상 영구
];

function suspendUntilIso(days: number | null): string {
  const ms = days === null ? 100 * 365 * 24 * 3600 * 1000 : days * 24 * 3600 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

function suspendedUntilLabel(iso: string): string {
  const until = new Date(iso);
  // 50년 이상 남았으면 영구 정지로 표기
  if (until.getTime() - Date.now() > 50 * 365 * 24 * 3600 * 1000) return "영구";
  return until.toLocaleDateString("ko-KR");
}

type Result = { identity: string; status: "success" | "error"; data: AdminUsersPageResponse | null };

export default function UsersClient() {
  // 대시보드 "정지 중 회원" 카드에서 ?filter=suspended 로 진입할 수 있다.
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "suspended">(
    searchParams.get("filter") === "suspended" ? "suspended" : "",
  );
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result>({ identity: "", status: "success", data: null });
  const generationRef = useRef(0);

  const requestIdentity = JSON.stringify([q, filter, page, retryTick]);

  useEffect(() => {
    const generation = ++generationRef.current;
    fetchAdminUsers({ q, suspended: filter === "suspended", page, size: PAGE_SIZE })
      .then((res) => {
        if (generation !== generationRef.current) return;
        if (res.content.length === 0 && page > 0) {
          setPage((currentPage) => Math.max(0, currentPage - 1));
          return;
        }
        setResult({ identity: requestIdentity, status: "success", data: res });
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        setResult({ identity: requestIdentity, status: "error", data: null });
      });
  }, [requestIdentity, q, filter, page]);

  const current = result.identity === requestIdentity;
  const loading = !current;
  const error = current && result.status === "error";
  const data = current && result.status === "success" ? result.data : null;
  const list = data?.content ?? [];

  const replaceUser = (updated: AdminUserItem) => {
    setResult((stored) =>
      stored.data
        ? {
            ...stored,
            data: {
              ...stored.data,
              content: stored.data.content.map((user) => (user.id === updated.id ? updated : user)),
            },
          }
        : stored,
    );
  };

  return (
    <div className="space-y-6" style={{ color: "var(--foreground)" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input.trim());
          setPage(0);
        }}
        className="flex items-center gap-2"
      >
        <div
          className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Search size={15} aria-hidden style={{ color: "var(--foreground-muted)" }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="이메일 또는 이름으로 검색"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:opacity-50"
            style={{ color: "var(--foreground)" }}
            aria-label="회원 검색"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl px-4 py-2.5 text-[13px]"
          style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
        >
          검색
        </button>
      </form>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="회원 필터">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setFilter(tab.id);
                setPage(0);
              }}
              className="rounded-full border px-4 py-2 text-[13px]"
              style={
                active
                  ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--surface-dark)" }
                  : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <StatePanel compact aria-busy="true">
          <Loader2 className="animate-spin" size={20} aria-hidden />
          <p>회원 목록을 불러오는 중입니다…</p>
        </StatePanel>
      ) : error ? (
        <StatePanel compact>
          <p>회원 목록을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            다시 시도
          </button>
        </StatePanel>
      ) : list.length === 0 ? (
        <StatePanel compact>
          <p>
            {q
              ? `"${q}" 검색 결과가 없습니다.`
              : filter === "suspended"
                ? "정지 중인 회원이 없습니다."
                : "회원이 없습니다."}
          </p>
        </StatePanel>
      ) : (
        <ul className="space-y-3">
          {list.map((user) => (
            <UserRow key={user.id} user={user} onUpdated={replaceUser} />
          ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          disabled={loading}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function UserRow({ user, onUpdated }: { user: AdminUserItem; onUpdated: (updated: AdminUserItem) => void }) {
  const confirm = useConfirm();
  // 본인 역할은 변경할 수 없다(마지막 관리자 잠금 방지 — 서버도 400 으로 거부).
  const profile = useAdminProfile();
  const isSelf = profile.id === user.id;
  const [days, setDays] = useState<string>("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  // 제재 대상이 아닌 계정(관리자/탈퇴)은 조작 UI를 숨긴다.
  const actionable = !user.deleted && user.role !== "ADMIN";

  const changeRole = async (nextRole: AdminUserItem["role"]) => {
    if (busy || nextRole === user.role) return;
    const nextLabel = USER_ROLE_LABELS[nextRole];
    const ok = await confirm({
      title: `${user.name}님의 역할을 "${nextLabel}"(으)로 변경할까요?`,
      message:
        nextRole === "USER"
          ? "관리 기능 접근이 즉시 차단됩니다."
          : "해당 역할의 관리 기능을 즉시 사용할 수 있게 됩니다.",
      confirmLabel: "역할 변경",
      destructive: nextRole === "USER",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await setAdminUserRole(user.id, nextRole);
      onUpdated(updated);
      toast.success(`${user.name}님의 역할을 ${nextLabel}(으)로 변경했습니다.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "역할 변경에 실패했습니다.") : "역할 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const suspend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const option = SUSPEND_OPTIONS.find((o) => String(o.days) === days) ?? SUSPEND_OPTIONS[1];
      const updated = await setAdminUserSuspension(user.id, {
        suspendedUntil: suspendUntilIso(option.days),
        reason: reason.trim() || undefined,
      });
      onUpdated(updated);
      setReason("");
      toast.success(`${user.name} 계정을 정지했습니다. (${option.label})`);
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "정지 처리에 실패했습니다.") : "정지 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const unsuspend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await setAdminUserSuspension(user.id, { suspendedUntil: null });
      onUpdated(updated);
      toast.success(`${user.name} 계정 정지를 해제했습니다.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? apiErrorMessage(e, "정지 해제에 실패했습니다.") : "정지 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-3xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        {user.deleted ? (
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold">{user.name}</span>
        ) : (
          <Link
            href={`/users/${user.id}`}
            className="inline-flex items-center gap-1 text-[14px] font-semibold hover:underline"
          >
            {user.name}
            {user.verified && <BadgeCheck size={14} aria-hidden style={{ color: "var(--accent-secondary)" }} />}
          </Link>
        )}
        <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          {user.email}
        </span>
        {user.role !== "USER" && (
          <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: "var(--accent-soft)", color: "var(--accent-secondary)" }}>
            {USER_ROLE_LABELS[user.role]}
          </span>
        )}
        {user.deleted && (
          <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: "var(--surface)", color: "var(--foreground-muted)" }}>
            탈퇴
          </span>
        )}
        {user.praiseRole && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
            <Music size={11} aria-hidden />
            찬양팀 {PRAISE_ROLE_LABELS[user.praiseRole]}
          </span>
        )}
        {user.suspended && user.suspendedUntil && (
          <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            정지 중 · {suspendedUntilLabel(user.suspendedUntil)}까지
          </span>
        )}
        <span className="ml-auto text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          {user.createdAt && `가입 ${new Date(user.createdAt).toLocaleDateString("ko-KR")} · `}
          게시글 {user.postCount} · 행사 {user.campaignCount}
        </span>
      </div>

      {user.suspended && user.suspendedReason && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          정지 사유: {user.suspendedReason}
        </p>
      )}

      {!user.deleted && (!isSelf || actionable) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isSelf && (
            <label className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <UserCog size={14} aria-hidden />}
              <span className="sr-only">{user.name}님의 역할</span>
              <select
                value={user.role}
                onChange={(e) => void changeRole(e.target.value as AdminUserItem["role"])}
                disabled={busy}
                className="bg-transparent py-0.5 outline-none disabled:opacity-50"
                style={{ color: "var(--foreground)" }}
              >
                {(Object.keys(USER_ROLE_LABELS) as Array<AdminUserItem["role"]>).map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {actionable &&
          (user.suspended ? (
            <button
              type="button"
              onClick={unsuspend}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
              정지 해제
            </button>
          ) : (
            <>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                aria-label="정지 기간"
                className="rounded-xl border px-3 py-2 text-[13px]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                {SUSPEND_OPTIONS.map((option) => (
                  <option key={option.label} value={String(option.days)}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="정지 사유 (선택)"
                className="min-w-40 flex-1 rounded-xl border px-3 py-2 text-[13px]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
              <button
                type="button"
                onClick={suspend}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] disabled:opacity-50"
                style={{ background: "var(--danger-solid)", color: "var(--on-danger)" }}
              >
                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ShieldBan size={14} aria-hidden />}
                정지
              </button>
            </>
          ))}
        </div>
      )}

      {/* 찬양팀 역할·파트 지정 — 사이트 역할과 독립(관리자 계정도 찬양팀 멤버일 수 있다). */}
      {!user.deleted && <PraiseTeamEditor user={user} onUpdated={onUpdated} />}
    </li>
  );
}

/**
 * 찬양팀 지정 편집기(펼침 영역). PATCH /api/admin/users/{id}/praise (ADMIN 전용).
 * 역할 "없음"으로 저장하면 파트도 함께 해제된다.
 */
function PraiseTeamEditor({ user, onUpdated }: { user: AdminUserItem; onUpdated: (updated: AdminUserItem) => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"" | PraiseTeamRole>(user.praiseRole ?? "");
  const [parts, setParts] = useState<string[]>(user.praiseParts ?? []);
  const [busy, setBusy] = useState(false);

  const togglePart = (part: string) =>
    setParts((prev) => (prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const praiseRole = role === "" ? null : role;
      const updated = await setPraiseRole(user.id, {
        praiseRole,
        praiseParts: praiseRole ? parts : [],
      });
      onUpdated(updated);
      setRole(updated.praiseRole ?? "");
      setParts(updated.praiseParts ?? []);
      toast.success(
        praiseRole
          ? `${user.name}님을 찬양팀 ${PRAISE_ROLE_LABELS[praiseRole]}(으)로 지정했습니다.`
          : `${user.name}님의 찬양팀 지정을 해제했습니다.`,
      );
    } catch (e) {
      toast.error(
        e instanceof ApiError
          ? apiErrorMessage(e, "찬양팀 지정에 실패했습니다.")
          : "찬양팀 지정에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]"
        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <Music size={14} aria-hidden style={{ color: "var(--accent)" }} />
        {user.praiseRole
          ? `찬양팀: ${PRAISE_ROLE_LABELS[user.praiseRole]}${user.praiseParts.length > 0 ? ` · ${user.praiseParts.length}개 파트` : ""}`
          : "찬양팀 지정"}
        {open ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
      </button>

      {open && (
        <div
          className="mt-2 space-y-3 rounded-2xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <label className="flex flex-wrap items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
            찬양팀 역할
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "" | PraiseTeamRole)}
              disabled={busy}
              className="rounded-xl border px-3 py-2 text-[13px] disabled:opacity-50"
              style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <option value="">없음</option>
              {(Object.keys(PRAISE_ROLE_LABELS) as PraiseTeamRole[]).map((r) => (
                <option key={r} value={r}>
                  {PRAISE_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          <fieldset disabled={role === "" || busy}>
            <legend className="mb-2 text-[13px]" style={{ color: "var(--foreground)" }}>
              파트 (복수 선택)
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PRAISE_PARTS.map((part) => (
                <label
                  key={part}
                  className={`inline-flex items-center gap-1.5 text-[13px] ${role === "" ? "opacity-40" : ""}`}
                  style={{ color: "var(--foreground)" }}
                >
                  <input
                    type="checkbox"
                    checked={parts.includes(part)}
                    onChange={() => togglePart(part)}
                    className="accent-[var(--accent)]"
                  />
                  {PRAISE_PART_LABELS[part]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-[var(--cta-fg)] disabled:opacity-50"
              style={{ background: "var(--cta-bg)" }}
            >
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
              찬양팀 설정 저장
            </button>
            {role === "" && (user.praiseRole || parts.length > 0) ? (
              <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                저장하면 찬양팀 지정이 해제됩니다.
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
