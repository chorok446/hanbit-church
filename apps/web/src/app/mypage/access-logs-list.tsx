"use client";

import { StaggerItem } from "@/components/scroll-reveal";
import { Monitor, Globe } from "lucide-react";
import { StatePanel } from "@/components/ui/state-panel";
import { fetchAccessLogsPage, type AccessLogItem } from "@/data/access-logs";
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
        <time dateTime={item.accessedAt} className="text-[11px] opacity-55">
          {formatTime(item.accessedAt)}
        </time>
      </div>
    </article>
  );
}

export function AccessLogsList({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-6 opacity-70" style={{ color: "var(--foreground-muted)" }}>
        최근 1년간 로그인·세션 갱신 시점의 OS와 IP를 보여줘요. IP는 보호를 위해 일부만 표시합니다.
      </p>
      <PaginatedSection<AccessLogItem>
        identityKey="access-logs"
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
