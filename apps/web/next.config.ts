import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 서버를 같은 공유기(사설망)의 실기기(폰)로 접속해 확인할 때 필요 — Next 16은 localhost 외
  // 오리진의 dev 요청(HMR·RSC)을 403으로 차단해 하이드레이션이 죽는다(링크만 되고 버튼 무반응).
  // dev 전용 옵션이라 프로덕션 동작에는 영향 없다.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // React Compiler 자동 메모이제이션 — 수동 useMemo/useCallback 없이 리렌더를 줄인다.
  // 빌드 시 babel-plugin-react-compiler(devDependency) 를 사용한다.
  reactCompiler: true,
  // Emit a self-contained server bundle at .next/standalone (with server.js) so the
  // production image can ship just the traced deps instead of the whole node_modules.
  // Env-gated: only the Docker prod build sets NEXT_OUTPUT_STANDALONE=1. Leaving it off keeps
  // `next start` working for local dev and the e2e/CI web server (standalone breaks `next start`).
  // In a pnpm monorepo the traced output nests under apps/web/ — see Dockerfile.prod.
  output: process.env.NEXT_OUTPUT_STANDALONE ? "standalone" : undefined,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // Next 인라인 스크립트/스타일과 무관하게 안전한 지시어만 강제한다.
            // script/style-src 전면 도입은 nonce 파이프라인이 필요해 별도 과제로 남긴다.
            // - object-src 'none': 플러그인(<object>/<embed>) 기반 주입 차단
            // - base-uri 'self': <base> 태그 주입으로 상대 URL 을 탈취하는 공격 차단
            // - frame-ancestors 'none': X-Frame-Options DENY 의 CSP 표준 대응(클릭재킹)
            // - form-action 'self': 주입된 <form> 이 자격 증명·입력값을 외부 도메인으로 제출하는 것 차단
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
          // MIME 스니핑 차단 — 렌더된 사용자 콘텐츠가 선언 타입과 다르게 해석되는 것을 막는다.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 외부로 나가는 리퍼러에서 경로·쿼리를 떼어 열람 페이지 URL 유출을 줄인다(origin 만 전송).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 미사용 브라우저 기능(카메라·마이크·위치)을 전면 차단해 서드파티 오남용 표면을 없앤다.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
