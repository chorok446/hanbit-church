"use client";

import { useEffect } from "react";

/**
 * 루트 레이아웃/최상위 에러 바운더리(error.tsx)까지 무너졌을 때의 마지막 폴백.
 * 이 컴포넌트는 <html>/<body> 를 직접 렌더해야 하고, globals.css·폰트·테마 토큰이
 * 로드되지 않았을 수 있어 전부 인라인 스타일로만 그린다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Sentry 는 DSN 이 설정된 배포에서만 동적 로드된다(instrumentation-client 와 동일 게이트).
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          background: "#faf8f3",
          color: "#1f2a44",
          fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>문제가 발생했어요</h1>
        <p style={{ margin: 0, maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: "#5a6072" }}>
          페이지를 그리는 중 오류가 났어요. 잠시 후 다시 시도해주세요.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              background: "#1f2a44",
              color: "#faf8f3",
            }}
          >
            다시 시도
          </button>
          {/* 라우터 컨텍스트까지 무너진 상황의 폴백이라 클라이언트 내비게이션(Link) 대신 전체 새로고침 이동이 안전하다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #d8d2c4",
              background: "#ffffff",
              color: "#1f2a44",
            }}
          >
            메인페이지로 이동
          </a>
        </div>
      </body>
    </html>
  );
}
