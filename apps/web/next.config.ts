import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
