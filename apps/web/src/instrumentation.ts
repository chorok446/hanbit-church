/**
 * Next.js 서버 계측 훅. SENTRY_DSN 이 설정된 경우에만 Sentry 를 동적 로드한다 —
 * DSN 이 없으면(기본) import 자체가 일어나지 않아 런타임 비용이 없다.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    // 에러 추적만 사용한다. 성능 트레이싱은 로컬 Prometheus 로 관측(비용·노이즈 절감).
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

/** 서버 렌더링/route handler 에러를 Sentry 로 전달(DSN 없으면 no-op). */
export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // captureRequestError 시그니처는 Next 의 onRequestError 와 동일하다.
  (Sentry.captureRequestError as (...a: unknown[]) => void)(...args);
}
