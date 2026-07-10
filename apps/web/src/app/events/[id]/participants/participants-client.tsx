"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, RefreshCw, ShieldCheck, UserMinus, Users } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { apiFetch, apiGet, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  increaseEventCapacity,
  removeEventParticipant,
  statusMeta,
  type EventParticipantsResponse,
} from "@/data/events";
import { PageShell } from "@/components/page-shell";

const PAGE_SIZE = 20;

type LoadState =
  | { identity: string; kind: "loading" }
  | { identity: string; kind: "ready"; data: EventParticipantsResponse }
  | { identity: string; kind: "forbidden" }
  | { identity: string; kind: "notfound" }
  | { identity: string; kind: "error" };

function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <PageShell paddingClassName="relative min-h-screen px-4 pb-20 pt-28 sm:px-6" orb="none">
      <StatePanel className="mx-auto min-h-72 max-w-2xl">
        {children}
      </StatePanel>
    </PageShell>
  );
}

export default function ParticipantsClient({ id }: { id: string }) {
  const router = useRouter();
  const { sessionId: token } = useAuthSession();
  const requestGenerationRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [capacityInput, setCapacityInput] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();
  const identity = `${id}:${token ?? "anonymous"}:${page}:${retry}`;
  const [loadState, setLoadState] = useState<LoadState>({ identity: "", kind: "loading" });
  const currentLoad: LoadState = loadState.identity === identity
    ? loadState
    : { identity, kind: "loading" };

  useEffect(() => {
    // hydration 중 useAuthSession의 server snapshot은 null일 수 있어 실제 localStorage 값을 확인한다.
    const requestToken = getSessionId();
    if (!requestToken) {
      requestInFlightRef.current = false;
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const generation = ++requestGenerationRef.current;
    requestInFlightRef.current = true;
    const isCurrent = () =>
      !cancelled
      && generation === requestGenerationRef.current
      && getSessionId() === requestToken;

    apiGet<EventParticipantsResponse>(
      `/api/events/${encodeURIComponent(id)}/participants?page=${page}&size=${PAGE_SIZE}`,
    )
      .then((response) => {
        if (!isCurrent()) return;
        // 마지막 참가자가 취소돼 현재 page가 비면 직전 page를 다시 조회한다.
        if (response.participants.length === 0 && page > 0) {
          setPage((current) => Math.max(0, current - 1));
          return;
        }
        setLoadState({ identity, kind: "ready", data: response });
      })
      .catch((error) => {
        if (!isCurrent()) return;
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          router.replace("/login");
        } else if (error instanceof ApiError && error.status === 403) {
          setLoadState({ identity, kind: "forbidden" });
        } else if (error instanceof ApiError && error.status === 404) {
          setLoadState({ identity, kind: "notfound" });
        } else {
          setLoadState({ identity, kind: "error" });
        }
      })
      .finally(() => {
        if (isCurrent()) requestInFlightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [id, identity, page, router]);

  const movePage = (nextPage: number) => {
    if (requestInFlightRef.current || currentLoad.kind !== "ready") return;
    requestInFlightRef.current = true;
    setPage(nextPage);
  };

  const refresh = () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setRetry((current) => current + 1);
  };

  /** 모집중 정원 증원 — 늘리기만 허용(서버 검증과 짝). 성공 시 목록을 다시 불러온다. */
  const increaseCapacity = async (current: number) => {
    const next = Number(capacityInput);
    if (savingCapacity) return;
    if (!Number.isInteger(next) || next <= current) {
      setActionError(`현재 정원(${current}명)보다 큰 정수를 입력해주세요.`);
      return;
    }
    setSavingCapacity(true);
    setActionError(null);
    try {
      await increaseEventCapacity(id, next);
      setCapacityInput("");
      refresh();
    } catch {
      setActionError("정원 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingCapacity(false);
    }
  };

  /** 명단 CSV 다운로드 — 서버가 목록과 동일한 정보(이름·인증)만 담아 내려준다. */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/events/${id}/participants/export`, { method: "GET" });
      if (!res.ok) throw new ApiError(res.status, "/participants/export", undefined, undefined);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `participants-${id}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("명단을 내려받지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setExporting(false);
    }
  };

  // 개설자 강제 퇴장. 성공 시 현재 page 를 재조회한다(load effect 가 빈 page 면 이전 page 로 이동).
  // 오류 시 목록은 유지하고 inline 메시지만 갱신한다.
  const removeParticipant = async (participantId: string) => {
    if (requestInFlightRef.current || removingId) return;
    if (
      !(await confirm({
        message: "이 참가자를 행사에서 제외할까요?\n제외된 사용자는 다시 참여할 수 있습니다.",
        destructive: true,
        confirmLabel: "제외",
      }))
    ) {
      return;
    }
    setRemovingId(participantId);
    setActionError(null);
    requestInFlightRef.current = true;
    try {
      await removeEventParticipant(id, participantId);
      requestInFlightRef.current = false;
      setRetry((current) => current + 1); // 현재 page 재조회 → joined/목록 갱신
    } catch (error) {
      requestInFlightRef.current = false;
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        setActionError("참가자를 제외할 권한이 없습니다.");
      } else if (error instanceof ApiError && error.status === 404) {
        setActionError("이미 제외되었거나 찾을 수 없는 참가자입니다.");
      } else if (error instanceof ApiError && error.status === 409) {
        setActionError("모집 중인 행사에서만 참가자를 제외할 수 있습니다.");
      } else {
        setActionError("참가자 제외에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (currentLoad.kind === "loading") {
    return <StateShell><p>참가자 목록을 불러오는 중입니다.</p></StateShell>;
  }
  if (currentLoad.kind === "forbidden") {
    return (
      <StateShell>
        <p>참가자 목록을 볼 권한이 없습니다.</p>
        <button type="button" onClick={() => router.push(`/events/${id}`)} className="rounded-xl bg-[var(--cta-bg)] px-4 py-2 text-[13px] text-[var(--cta-fg)]">
          행사로 돌아가기
        </button>
      </StateShell>
    );
  }
  if (currentLoad.kind === "notfound") {
    return (
      <StateShell>
        <p>행사를 찾을 수 없습니다.</p>
        <button type="button" onClick={() => router.push("/events")} className="rounded-xl bg-[var(--cta-bg)] px-4 py-2 text-[13px] text-[var(--cta-fg)]">
          행사 목록
        </button>
      </StateShell>
    );
  }
  if (currentLoad.kind === "error") {
    return (
      <StateShell>
        <p>참가자 목록을 불러오지 못했습니다.</p>
        <button type="button" onClick={refresh} className="rounded-xl bg-[var(--cta-bg)] px-4 py-2 text-[13px] text-[var(--cta-fg)]">
          다시 시도
        </button>
      </StateShell>
    );
  }

  const { data } = currentLoad;
  const status = statusMeta[data.status];
  return (
    <PageShell paddingClassName="relative min-h-screen px-4 pb-20 pt-28 sm:px-6" orb="none">
      <div className="relative mx-auto max-w-4xl">
        <Link
          href={`/events/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-[13px] opacity-70 transition-opacity hover:opacity-100"
          style={{ color: "var(--foreground)" }}
        >
          <ArrowLeft size={14} /> 행사 상세로 돌아가기
        </Link>

        <div
          className="overflow-hidden rounded-3xl border"
          style={{
            background: "var(--glass)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <header className="border-b px-5 py-6 sm:px-8" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-[11px] tracking-[0.16em]" style={{ background: status.color, color: status.fg }}>
                    {status.label}
                  </span>
                  <span className="text-[12px] opacity-55">참가자 관리</span>
                </div>
                <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{data.title}</h1>
                <p className="mt-2 text-[13px] opacity-60">현재 참여 인원 {data.joined}명 / 정원 {data.capacity}명</p>
                {data.status === "open" && data.capacity > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor="capacity-increase" className="text-[12px] opacity-70">
                      정원 늘리기
                    </label>
                    <input
                      id="capacity-increase"
                      type="number"
                      min={data.capacity + 1}
                      value={capacityInput}
                      onChange={(e) => setCapacityInput(e.target.value)}
                      placeholder={`${data.capacity + 5}`}
                      className="ui-control w-24 rounded-xl px-3 py-2 text-[13px]"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <button
                      type="button"
                      onClick={() => void increaseCapacity(data.capacity)}
                      disabled={savingCapacity || !capacityInput}
                      className="rounded-xl border px-4 py-2 text-[13px] disabled:opacity-45"
                      style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                    >
                      {savingCapacity ? "변경 중…" : "변경"}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 self-start">
                <button
                  type="button"
                  onClick={() => void exportCsv()}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] disabled:opacity-45"
                  style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
                >
                  <Download size={14} /> {exporting ? "내려받는 중…" : "CSV 내보내기"}
                </button>
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] disabled:opacity-45"
                  style={{ background: "rgba(var(--ink-rgb), 0.08)" }}
                >
                  <RefreshCw size={14} /> 새로고침
                </button>
              </div>
            </div>
          </header>

          <div className="px-5 py-5 sm:px-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[14px] font-medium">
                <Users size={16} /> 참가자 {data.totalElements}명
              </div>
              <span className="text-[12px] opacity-55">사용자 ID 순</span>
            </div>

            {actionError ? (
              <div
                className="mb-3 rounded-xl px-4 py-3 text-[13px]"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                {actionError}
              </div>
            ) : null}

            {data.participants.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-5 py-14 text-center text-[14px] opacity-65" style={{ borderColor: "rgba(var(--ink-rgb), 0.13)" }}>
                아직 참여자가 없습니다.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {data.participants.map((participant) => (
                  <li key={participant.participantId} className="flex min-h-14 flex-col items-start justify-between gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="min-w-0 truncate text-[14px] font-medium">{participant.name}</span>
                    <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
                      {participant.verified ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] text-[var(--success)]">
                          <ShieldCheck size={12} /> 후기 작성자
                        </span>
                      ) : null}
                      {/* 퇴장은 모집 중(open)인 행사에서만. 처리 중인 행은 disabled. */}
                      {data.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => removeParticipant(participant.participantId)}
                          disabled={removingId !== null}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                        >
                          <UserMinus size={13} /> {removingId === participant.participantId ? "처리 중…" : "퇴장"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Pagination
              page={data.page}
              totalPages={Math.max(1, data.totalPages)}
              totalElements={data.totalElements}
              className="mt-6 border-t pt-5"
              onPageChange={movePage}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
