"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { ApiError } from "@/lib/api";
import { fetchPraiseSetlist, type PraiseSetlist } from "@/data/praise-team";
import { SectionLabel } from "../../../praise-ui";
import { AssignmentEditor } from "../../assignment-editor";
import { LeaderOnly, SetlistForm } from "../../setlist-form";

type Result = { key: string; error: string | null; setlist: PraiseSetlist | null };

/** 콘티 수정(리더 전용) — 예배 정보·곡·공지 폼 + 파트 배정 편집. */
export function EditSetlistClient({ setlistId }: { setlistId: string }) {
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const requestKey = `${setlistId}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchPraiseSetlist(setlistId)
      .then((setlist) => {
        if (!cancelled) setResult({ key: requestKey, error: null, setlist });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          setlist: null,
          error:
            e instanceof ApiError && e.status === 403
              ? "찬양팀 접근 권한이 없습니다. 관리자 또는 리더에게 문의해 주세요."
              : "콘티를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [setlistId, requestKey]);

  const loading = result === null || result.key !== requestKey;
  const error = loading ? null : result.error;
  const setlist = loading ? null : result.setlist;

  return (
    <PageShell orb="right" paddingClassName="px-6 pb-24 pt-32">
      <div className="mx-auto max-w-4xl">
        <LeaderOnly>
          <Link
            href={`/praise-team/setlists/${setlistId}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px]"
            style={{ color: "var(--foreground-muted)" }}
          >
            <ArrowLeft size={14} aria-hidden />
            콘티 상세로
          </Link>

          {loading || error ? (
            <StatePanel className="mx-auto mt-6 max-w-xl">
              {error ? (
                <>
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setRetryTick((t) => t + 1)}
                    className="rounded-full border px-4 py-2 text-[13px]"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    다시 시도
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="animate-spin" size={20} aria-hidden />
                  <p>콘티를 불러오는 중입니다…</p>
                </>
              )}
            </StatePanel>
          ) : !setlist ? (
            <StatePanel className="mx-auto mt-6 max-w-xl">
              <p>콘티를 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었을 수 있어요.</p>
              <Link
                href="/praise-team/setlists"
                className="rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                콘티 목록으로
              </Link>
            </StatePanel>
          ) : (
            <>
              <header className="mt-4">
                <SectionLabel>Edit Setlist</SectionLabel>
                <h1
                  className="mt-2 text-[28px] sm:text-[32px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  콘티 수정
                </h1>
              </header>
              <div className="mt-6 space-y-6">
                <SetlistForm initial={setlist} />
                <AssignmentEditor
                  setlist={setlist}
                  onSaved={(updated) =>
                    setResult((prev) => (prev ? { ...prev, setlist: updated } : prev))
                  }
                />
              </div>
            </>
          )}
        </LeaderOnly>
      </div>
    </PageShell>
  );
}
