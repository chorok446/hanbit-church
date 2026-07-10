"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StaggerItem } from "@/components/scroll-reveal";
import { Monitor, Globe, LogOut, Loader2 } from "lucide-react";
import { StatePanel } from "@/components/ui/state-panel";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { fetchAccessLogsPage, revokeOtherSessions, revokeSession, type AccessLogItem } from "@/data/access-logs";
import { PaginatedSection } from "./paginated-section";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

/**
 * 표시 전용 IP 마스킹. 원본은 그대로 두고 화면에서만 가린다.
 * IPv4는 마지막 옥텟(`127.0.0.*`), IPv6는 뒤 절반을 `…`로 마스킹한다.
 */
export function maskIpForDisplay(ip: string): string {
  const trimmed = ip.trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    return `${trimmed.split(".").slice(0, 3).join(".")}.*`;
  }
  if (trimmed.includes(":")) {
    const groups = trimmed.split(":");
    const keep = Math.max(1, Math.floor(groups.length / 2));
    return `${groups.slice(0, keep).join(":")}:…`;
  }
  return trimmed; // 형식을 모르는 값(예: "알 수 없음")은 그대로 표시
}

function AccessLogRow({ item }: { item: AccessLogItem }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  // 성공 후 목록을 다시 불러오지 않고 행 상태만 바꾼다(로그 자체는 그대로 남는 이력이므로).
  const [revokedLocally, setRevokedLocally] = useState(false);
  const revoked = item.sessionRevoked || revokedLocally;

  const revoke = async () => {
    if (!item.sessionId || busy) return;
    const ok = await confirm({
      title: "이 세션을 로그아웃할까요?",
      message: "해당 기기의 로그인이 즉시 해제됩니다. 본인 기기가 아니라면 비밀번호 변경도 권장해요.",
      confirmLabel: "세션 로그아웃",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await revokeSession(item.sessionId);
      setRevokedLocally(true);
      toast.success("세션을 로그아웃했습니다.");
    } catch {
      toast.error("세션 로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="rounded-2xl border p-5"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.currentSession ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
            >
              현재 세션
            </span>
          ) : null}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
            style={{ background: "var(--accent-soft)", color: "var(--accent-secondary)" }}
          >
            <Monitor size={12} aria-hidden />
            {item.os}
            {item.browser && item.browser !== "알 수 없음" ? ` · ${item.browser}` : null}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
            style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
          >
            <Globe size={12} aria-hidden />
            {maskIpForDisplay(item.ipAddress)}
            {item.location ? ` · ${item.location}` : null}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <time dateTime={item.accessedAt} className="text-[11px] opacity-55">
            {formatTime(item.accessedAt)}
          </time>
          {revoked ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
            >
              로그아웃됨
            </span>
          ) : item.sessionRevocable && item.sessionId ? (
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
            >
              {busy ? <Loader2 size={11} className="animate-spin" aria-hidden /> : <LogOut size={11} aria-hidden />}
              세션 로그아웃
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AccessLogsList({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  const confirm = useConfirm();
  const [revokingAll, setRevokingAll] = useState(false);
  // 전체 로그아웃 후 목록을 다시 불러오기 위한 identity 틱.
  const [refreshTick, setRefreshTick] = useState(0);

  const revokeAll = async () => {
    if (revokingAll) return;
    const ok = await confirm({
      title: "다른 세션을 모두 로그아웃할까요?",
      message: "지금 사용 중인 이 세션만 남고, 다른 모든 기기의 로그인이 즉시 해제됩니다.",
      confirmLabel: "모두 로그아웃",
      destructive: true,
    });
    if (!ok) return;
    setRevokingAll(true);
    try {
      const result = await revokeOtherSessions();
      toast.success(
        result.revokedCount > 0
          ? `${result.revokedCount}개 세션을 로그아웃했습니다.`
          : "로그아웃할 다른 세션이 없습니다.",
      );
      setRefreshTick((t) => t + 1);
    } catch {
      toast.error("세션 로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] leading-6 opacity-70" style={{ color: "var(--foreground-muted)" }}>
          최근 1년간 로그인·세션 갱신 시점의 OS와 IP를 보여줘요. IP는 보호를 위해 일부만 표시합니다.
        </p>
        <button
          type="button"
          onClick={() => void revokeAll()}
          disabled={revokingAll}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--danger)" }}
        >
          {revokingAll ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <LogOut size={13} aria-hidden />}
          다른 세션 모두 로그아웃
        </button>
      </div>
      <PaginatedSection<AccessLogItem>
        identityKey={`access-logs:${refreshTick}`}
        page={page}
        onPageChange={onPageChange}
        fetcher={fetchAccessLogsPage}
        loadingLabel="접속 기록을 불러오는 중입니다."
        errorLabel="접속 기록을 불러오지 못했습니다."
        empty={
          <StatePanel className="min-h-48 rounded-2xl">
            <Monitor size={28} className="text-[var(--accent)]" />
            <p>최근 접속 기록이 없습니다.</p>
          </StatePanel>
        }
        renderItems={(items) => (
          <div className="space-y-3">
            {items.map((item, i) => (
              <StaggerItem key={item.id} index={i}>
                <AccessLogRow item={item} />
              </StaggerItem>
            ))}
          </div>
        )}
      />
    </div>
  );
}
