"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Music } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { ApiError } from "@/lib/api";
import {
  fetchPraiseMembers,
  praisePartLabel,
  PRAISE_ROLE_LABELS,
  type PraiseMember,
} from "@/data/praise-team";
import { SectionLabel } from "../praise-ui";

/** 팀원 목록 — 이름·역할·파트만 표시(이메일·연락처는 API 자체가 주지 않는다). */
export function MembersClient() {
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<{
    key: number;
    error: string | null;
    members: PraiseMember[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPraiseMembers()
      .then((members) => {
        if (!cancelled) setResult({ key: retryTick, error: null, members });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: retryTick,
          members: [],
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "팀원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const loading = result === null || result.key !== retryTick;
  const error = loading ? null : result.error;
  const members = loading || !result ? [] : result.members;

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

        <header className="mt-4">
          <SectionLabel>Members</SectionLabel>
          <h1
            className="mt-2 text-[28px] sm:text-[32px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            팀원 목록
          </h1>
          <p className="mt-2 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
            팀원 추가·역할 변경은 관리자 페이지(회원 관리)에서 합니다.
          </p>
        </header>

        <div className="mt-6">
          {loading ? (
            <StatePanel compact>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>팀원 목록을 불러오는 중입니다…</p>
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
          ) : members.length === 0 ? (
            <StatePanel compact>
              <p>아직 찬양팀으로 지정된 회원이 없습니다.</p>
            </StatePanel>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-start gap-3 rounded-3xl border p-5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                  >
                    <Music size={16} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-[16px]"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                      >
                        {member.name}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={
                          member.praiseRole === "LEADER"
                            ? { background: "var(--accent-soft)", color: "var(--accent-strong)" }
                            : { background: "var(--chip-bg)", color: "var(--foreground-muted)" }
                        }
                      >
                        {PRAISE_ROLE_LABELS[member.praiseRole]}
                      </span>
                    </p>
                    <p className="mt-1 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                      {member.praiseParts.length > 0
                        ? member.praiseParts.map(praisePartLabel).join(" · ")
                        : "지정된 파트 없음"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
