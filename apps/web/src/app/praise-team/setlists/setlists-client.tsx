"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListMusic, Loader2, MapPin, PlusCircle, Users } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { formatDateLabel } from "@/data/calendar";
import { ApiError } from "@/lib/api";
import { fetchPraiseSetlistPage, type PraiseSetlistPage } from "@/data/praise-team";
import { usePraiseProfile } from "../praise-team-guard";
import { PraiseBand, SetlistStatusBadge } from "../praise-ui";

const PAGE_SIZE = 10;

/** 콘티 목록 — 예배일 최신순(서버 정렬·페이지네이션), 상태 배지 표시. */
export function SetlistsClient() {
  const profile = usePraiseProfile();
  const isLeader = profile.praiseRole === "LEADER" || profile.role === "ADMIN";

  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    error: string | null;
    data: PraiseSetlistPage | null;
  } | null>(null);

  const requestKey = `${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchPraiseSetlistPage({ page, size: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, error: null, data });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          data: null,
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "콘티 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryTick, requestKey]);

  const loading = result === null || result.key !== requestKey;
  const error = loading ? null : result.error;
  const setlists = loading || !result?.data ? [] : result.data.content;
  const pageData = loading ? null : result?.data ?? null;

  return (
    <>
      <PraiseBand
        eyebrow="Setlists"
        title="콘티 목록"
        back={{ href: "/praise-team", label: "찬양팀 홈" }}
      />
      <PageShell orb="right" paddingClassName="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-[896px]">
        {isLeader ? (
          <div className="mb-6 flex justify-end">
            <Link
              href="/praise-team/setlists/new"
              className="cta-solid inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-medium"
            >
              <PlusCircle size={14} aria-hidden />새 콘티 작성
            </Link>
          </div>
        ) : null}

        <div>
          {loading ? (
            <StatePanel compact>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>콘티 목록을 불러오는 중입니다…</p>
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
          ) : setlists.length === 0 ? (
            <StatePanel compact>
              <p>등록된 콘티가 아직 없습니다. 리더가 콘티를 올리면 이곳에 표시됩니다.</p>
            </StatePanel>
          ) : (
            <ul className="space-y-3">
              {setlists.map((setlist) => (
                <li key={setlist.id}>
                  <Link
                    href={`/praise-team/setlists/${setlist.id}`}
                    className="block rounded-3xl border p-5 transition-colors"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2
                        className="text-[18px]"
                        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                      >
                        {formatDateLabel(setlist.worshipDate)} {setlist.worshipType}
                      </h2>
                      <SetlistStatusBadge status={setlist.status} />
                    </div>
                    <p className="mt-1 text-[14px]" style={{ color: "var(--foreground)" }}>
                      {setlist.title}
                    </p>
                    <div
                      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]"
                      style={{ color: "var(--foreground-muted)" }}
                    >
                      {setlist.serviceTime ? <span>{setlist.serviceTime}</span> : null}
                      {setlist.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                          {setlist.location}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <ListMusic size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />곡{" "}
                        {setlist.songCount}개
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} aria-hidden style={{ color: "var(--accent-strong)" }} />
                        배정 {setlist.assignmentCount}명
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pageData && pageData.totalPages > 1 ? (
            <Pagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              totalElements={pageData.totalElements}
              onPageChange={setPage}
              className="mt-6"
            />
          ) : null}
        </div>
        </div>
      </PageShell>
    </>
  );
}
