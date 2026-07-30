"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSessionId } from "@/lib/auth";
import { beginAuthedRequest, clearSessionIfUnauthorized } from "@/lib/authed-request";
import { useAuthSession } from "@/lib/use-auth-session";
import { PageShell } from "@/components/page-shell";
import { StaggerItem } from "@/components/scroll-reveal";
import { ListEmptyState } from "@/components/list-empty-state";
import { SkeletonCards } from "@/components/ui/skeleton-cards";
import { StatePanel } from "@/components/ui/state-panel";
import { Pagination } from "@/components/ui/pagination";
import { PrayerCard } from "./prayer-card";
import type { PostSearchResponse } from "@/data/posts";

const PAGE_SIZE = 10;

type State = {
  identity: string;
  status: "loading" | "success" | "error";
  response: PostSearchResponse | null;
};

export default function PrayerClient() {
  const router = useRouter();
  const { sessionId: token } = useAuthSession();
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const generationRef = useRef(0);

  const requestIdentity = useMemo(
    () => JSON.stringify([token, page, retryTick]),
    [token, page, retryTick],
  );
  const [state, setState] = useState<State>({ identity: "", status: "loading", response: null });
  const isCurrent = state.identity === requestIdentity;
  // 새 요청(로그인 상태·페이지 변경) 진행 중에는 직전 응답을 유지해 화면 깜빡임을 줄인다.
  const response = state.response;
  const status = isCurrent ? state.status : "loading";
  const refreshing = status === "loading";

  useEffect(() => {
    const requestToken = token;
    if (getSessionId() !== requestToken) return;
    const guard = beginAuthedRequest(generationRef, requestToken);
    const path = `/api/posts/search?category=PRAYER&sort=latest&page=${page}&size=${PAGE_SIZE}`;
    apiGet<PostSearchResponse>(path)
      .then((next) => {
        if (!guard.isCurrent()) return;
        setState({ identity: requestIdentity, status: "success", response: next });
      })
      .catch((error) => {
        if (!guard.isCurrent()) return;
        if (clearSessionIfUnauthorized(error, requestToken)) return;
        setState((prev) => ({ identity: requestIdentity, status: "error", response: prev.response }));
      });
    return guard.cancel;
  }, [requestIdentity, page, token]);

  return (
    <>
      {/* 컴팩트 네이비 밴드 — 커뮤니티/앱 페이지 공통 헤더(마케팅 히어로 아님). */}
      <section className="px-6 pb-11 pt-[124px]" style={{ background: "var(--banner-bg)" }}>
        <div className="mx-auto max-w-3xl">
          <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
          <h1
            className="text-[32px] text-[var(--on-banner)] sm:text-[38px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            기도벽
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "rgba(var(--on-banner-rgb),0.72)" }}>
            서로의 기도제목을 모아 함께 중보하는 공간입니다. 마음이 닿았다면 &ldquo;함께 기도했어요&rdquo;로 곁을 지켜 주세요.
          </p>
        </div>
      </section>

      <PageShell paddingClassName="relative min-h-screen px-6 pb-20 pt-10 overflow-hidden" orb="left">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push("/posts/new")}
              className="rounded-full cta-solid px-5 py-2.5 text-[13px] font-medium"
            >
              기도제목 나누기
            </button>
            <button
              type="button"
              aria-label="기도벽 새로고침"
              title="기도벽 새로고침"
              onClick={() => setRetryTick((t) => t + 1)}
              disabled={refreshing}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-45"
              style={{ background: "rgba(var(--ink-rgb), 0.07)" }}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {status === "loading" && !response ? <SkeletonCards count={4} className="grid grid-cols-1 gap-4" /> : null}

          {status === "error" && !response ? (
            <StatePanel>
              <p style={{ color: "var(--foreground-muted)" }}>기도제목을 불러오지 못했습니다.</p>
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="rounded-full cta-solid px-5 py-2 text-[13px]"
              >
                다시 시도
              </button>
            </StatePanel>
          ) : null}

          {status === "success" && response?.content.length === 0 ? (
            <ListEmptyState
              title="아직 기도제목이 없어요."
              description="첫 기도제목을 나눠 주세요. 익명·교인만 공개도 선택할 수 있습니다."
              action={
                <button
                  type="button"
                  onClick={() => router.push("/posts/new")}
                  className="rounded-full cta-solid px-5 py-2 text-[13px] font-medium"
                >
                  기도제목 나누기
                </button>
              }
            />
          ) : null}

          {response && response.content.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {response.content.map((post, i) => (
                <StaggerItem key={post.id} index={i}>
                  <PrayerCard p={post} refreshing={refreshing} identity={token} />
                </StaggerItem>
              ))}
            </div>
          ) : null}

          {response && response.totalElements > 0 ? (
            <Pagination
              page={response.page}
              totalPages={response.totalPages}
              totalElements={response.totalElements}
              disabled={refreshing}
              className="mt-8"
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </PageShell>
    </>
  );
}
