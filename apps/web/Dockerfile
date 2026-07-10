# 로컬 Docker Compose / 개발용 Web 이미지. pnpm 모노레포 루트를 build context 로 사용한다.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web apps/web

RUN pnpm install --frozen-lockfile --filter web

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter web build

FROM base AS runner
# SSR 날짜 로직(월별 말씀 등)·로그 타임스탬프 — 코드가 KST 고정이어도 로그·미래 코드 안전망.
ENV TZ=Asia/Seoul
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
