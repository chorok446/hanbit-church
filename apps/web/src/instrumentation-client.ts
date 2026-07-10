/**
 * 클라이언트 계측(Next 15.3+ instrumentation-client). NEXT_PUBLIC_SENTRY_DSN 이
 * 설정된 경우에만 Sentry 청크를 동적 로드한다 — DSN 이 없으면(기본) 번들에서
 * 로드되지 않아 페이지 무게에 영향이 없다.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
      // 에러 추적만 사용한다(트레이싱·리플레이 비활성 — 개인 정보·전송량 최소화).
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  });
}
