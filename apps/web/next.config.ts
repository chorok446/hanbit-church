import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
