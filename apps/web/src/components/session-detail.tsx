"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiGet, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";

type Props<T> = {
  identity: string;
  initialData?: T | null;
  load: () => Promise<T | null>;
  fallback: ReactNode;
  notFoundFallback?: ReactNode;
  children: (data: T) => ReactNode;
};

/**
 * SSR에서 판정하지 못한 상세와 비공개 상세의 인증 경계.
 * API 호스트 전용 httpOnly 쿠키도 지원하도록 router.refresh 대신 브라우저에서 조회한다.
 * 공개/존재 여부는 API만 판정하며, 로컬 마커는 재확인을 시작하는 신호로만 사용한다.
 */
export function SessionDetail<T>(props: Props<T>) {
  const { sessionId, hydrated } = useAuthSession();
  if (!hydrated) return props.initialData ? props.children(props.initialData) : props.fallback;
  if (!sessionId) return props.fallback;
  // identity 변경 시 내용과 진행 중 요청을 모두 버려 이전 계정의 표시가 남지 않게 한다.
  return <SessionDetailRequest key={`${props.identity}:${sessionId}`} {...props} sessionId={sessionId} />;
}

function SessionDetailRequest<T>({ load, fallback, notFoundFallback, children, sessionId }: Props<T> & { sessionId: string }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "missing" | "error"; data?: T }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const isCurrent = () => !cancelled && getSessionId() === sessionId;
    async function recover() {
      try {
        // 상세는 access 쿠키가 사라지면 401이 아니라 404를 반환한다.
        // 인증 필수 /me를 먼저 거쳐 기존 apiFetch의 single-flight refresh를 사용한다.
        await apiGet("/api/auth/me");
        if (!isCurrent()) return;
        const data = await load();
        if (isCurrent()) setState(data === null ? { status: "missing" } : { status: "ready", data });
      } catch (error) {
        if (!isCurrent()) return;
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
        } else if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          setState({ status: "missing" });
        } else {
          setState({ status: "error" });
        }
      }
    }
    void recover();
    return () => { cancelled = true; };
  }, [attempt, load, sessionId]);

  if (state.status === "ready") return children(state.data!);
  if (state.status === "missing") return notFoundFallback ?? fallback;
  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center" style={{ color: "var(--foreground)" }}>
      <p role={state.status === "error" ? "alert" : "status"}>
        {state.status === "error" ? "내용을 불러오지 못했어요. 잠시 후 다시 시도해주세요." : "로그인 상태와 내용을 확인하고 있어요."}
      </p>
      {state.status === "error" ? (
        <button type="button" className="cta-solid rounded-full px-6 py-3" onClick={() => {
          setState({ status: "loading" });
          setAttempt((value) => value + 1);
        }}>다시 시도</button>
      ) : null}
    </section>
  );
}
