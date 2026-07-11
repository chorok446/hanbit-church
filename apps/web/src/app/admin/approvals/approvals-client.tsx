"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  approveUser,
  fetchPendingUsers,
  rejectUser,
  type AdminUserItem,
  type AdminUsersPageResponse,
} from "@/data/admin";

const PAGE_SIZE = 20;

type Result = { key: string; status: "success" | "error"; data: AdminUsersPageResponse | null };

/** 가입 승인 대기 회원 목록 — 승인해야 로그인할 수 있다(실명 확인 후 승인). */
export default function ApprovalsClient() {
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const confirm = useConfirm();

  const requestKey = `${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchPendingUsers({ page, size: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryTick, requestKey]);

  const onApprove = async (user: AdminUserItem) => {
    if (savingId !== null) return;
    setSavingId(user.id);
    try {
      await approveUser(user.id);
      toast.success(`${user.name}님의 가입을 승인했어요.`);
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("승인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingId(null);
    }
  };

  const onReject = async (user: AdminUserItem) => {
    if (savingId !== null) return;
    if (
      !(await confirm({
        message: `${user.name}(${user.email})님의 가입을 거절할까요? 계정이 비활성화됩니다.`,
        destructive: true,
        confirmLabel: "거절",
      }))
    ) {
      return;
    }
    setSavingId(user.id);
    try {
      await rejectUser(user.id);
      toast.success("가입을 거절했어요.");
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingId(null);
    }
  };

  const loading = result === null || result.key !== requestKey;

  if (loading) {
    return (
      <StatePanel compact>
        <Loader2 className="animate-spin" size={20} aria-hidden />
        <p>승인 대기 회원을 불러오는 중입니다…</p>
      </StatePanel>
    );
  }

  if (result.status === "error" || !result.data) {
    return (
      <StatePanel compact>
        <p>목록을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => setRetryTick((t) => t + 1)}
          className="rounded-full border px-4 py-2 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          다시 시도
        </button>
      </StatePanel>
    );
  }

  const { data } = result;

  return (
    <div className="space-y-5">
      <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
        승인 대기 <b style={{ color: "var(--foreground)" }}>{data.totalElements.toLocaleString()}명</b> — 실명과
        교우 여부를 확인한 뒤 승인해 주세요. 승인 전에는 로그인할 수 없습니다.
      </p>

      {data.content.length === 0 ? (
        <StatePanel compact>
          <p>승인 대기 중인 가입 신청이 없습니다.</p>
        </StatePanel>
      ) : (
        <ul className="space-y-3">
          {data.content.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
                    {user.name}
                  </span>
                  <span className="break-all text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                    {user.email}
                  </span>
                </div>
                <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  {user.createdAt
                    ? `${new Date(user.createdAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })} 신청`
                    : "신청 시각 정보 없음"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onApprove(user)}
                  disabled={savingId !== null}
                  aria-busy={savingId === user.id}
                  className="cta-solid inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] disabled:opacity-50"
                >
                  {savingId === user.id ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Check size={13} aria-hidden />}
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => void onReject(user)}
                  disabled={savingId !== null}
                  className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
                  style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                >
                  <X size={13} aria-hidden />
                  거절
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 ? <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} /> : null}
    </div>
  );
}
