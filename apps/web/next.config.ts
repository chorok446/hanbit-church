import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle at .next/standalone (with server.js) so the
  // production image can ship just the traced deps instead of the whole node_modules.
  // In a pnpm monorepo the standalone output nests under apps/web/ — see Dockerfile.prod.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
