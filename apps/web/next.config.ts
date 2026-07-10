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
};

export default nextConfig;
