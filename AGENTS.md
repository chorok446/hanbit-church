# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

> **Source of truth**: `CLAUDE.md` is the continuously maintained project guide (Korean) with the full, current gotcha list. This file is a condensed English mirror — when they disagree, `CLAUDE.md` wins.

> **커밋·PR 언어 (사용자 지시)**: 커밋 제목·본문, PR 제목·본문, 변경 요약은 가급적 한국어로 작성한다. `fix:`·`feat:`·`chore:` 등 Conventional Commits 접두사와 기술 식별자는 유지하고 설명 부분을 한글로 쓴다. 기존 커밋 이력은 언어 변경만을 위해 재작성하지 않는다.

> **Branch naming (user instruction)**: Do not use the `codex/` prefix. Follow the Git workflow convention: `feature/`, `fix/`, `chore/`, or `refactor/` plus a short kebab-case description, unless the user specifies an exact name. Branch from `origin/develop` and target `develop` in development PRs.

## Project

**한빛교회 홈페이지** — a Korean church website (Hanbit First Church) forked from the **다시,다 (Dasida)** community platform and re-skinned as a church site. pnpm + Gradle monorepo. The `upstream` remote points at the original (dasida); only needed improvements are cherry-picked.

- **Domain naming**: 캠페인 = "행사·사역" (events/ministry), 피드 = "교제" (fellowship). Post categories are 공지·주보·설교·나눔·기도. Standalone domains beyond posts: daily devotion (큐티, `/devotion` + `/api/devotions`), prayer wall (`/prayer`), cell groups (소그룹/목장, `/cell-groups` + `/api/cell-groups`, auth-only), praise team (`/praise-team`), giving info (`/giving`, env-injected account/QR/deep links). Church info (name/address/service schedule/monthly verse) lives in `apps/web/src/data/church.ts`.
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind v4 → `apps/web`
- **Backend**: Kotlin + Spring Boot 4.1 (Gradle Kotlin DSL, Kotlin 2.4) → `apps/api`
- **DB**: MySQL 8 via JPA/Hibernate (introduced for JWT auth persistence). Local DB runs from `docker-compose.yml` at root (`docker compose up -d`). Domains (posts/events/notifications/users) are JPA entities; list/nested fields are stored as JSON columns. Seed data loads once into empty tables via `SeedRunner`. Tests run on in-memory H2 (MySQL mode), no Docker needed. QueryDSL (openfeign fork) is wired via kapt.
- **`design-reference/`**: the original **dasida Figma export** (a standalone Vite React SPA). Reference only in the church project — **not** the design source of truth (that's the 모던 클래식 tokens in `CLAUDE.md`). Don't run it as part of the app.

## Layout

```
apps/web   # Next.js frontend
apps/api   # Kotlin + Spring Boot backend
packages/  # shared TS packages (empty until needed)
design-reference/  # Figma export, reference only
```

`pnpm-workspace.yaml` globs `apps/*` + `packages/*`. `apps/api` has no `package.json`, so pnpm ignores it — it's Gradle-only.

## Commands

From repo root:

```bash
pnpm install        # installs JS workspace (web + packages)
pnpm dev:web        # Next.js dev server
pnpm build:web      # Next.js production build
pnpm dev:api        # Spring Boot (gradlew bootRun)
pnpm build:api      # gradlew build
```

Backend directly (from `apps/api/`): `./gradlew bootRun`, `./gradlew test`, `./gradlew build`.

## Gotchas

- **JDK toolchain**: backend targets **JDK 21** via a Gradle toolchain. If the dev machine has a different JDK, the `foojay-resolver-convention` plugin in `apps/api/settings.gradle.kts` auto-downloads JDK 21 — don't change the target to match a local JDK.
- **pnpm build approvals**: `sharp` and `unrs-resolver` are pre-approved under `allowBuilds:` in `pnpm-workspace.yaml`. New deps with install scripts will be blocked until added there.
- **Health endpoint**: Spring Actuator is included → `/actuator/health`.
- **Auth**: JWT (jjwt) + Spring Security, stateless. Tokens ride **httpOnly cookies** — access `hanbit_token`, refresh `hanbit_refresh` (rotation, `Path=/api/auth`); `Authorization: Bearer` is also accepted. Most `GET /api/**` are public, but per-user GETs (`/api/auth/me`, `/api/posts/mine`, `/api/notifications/**`, …) require auth — see `SecurityConfig.kt`. Frontend keeps only a session marker in `localStorage` (`apps/web/src/lib/auth.ts`); the JWT is never readable from JS. Tokens carry a `sid` session claim (kept across refresh rotation — powers the access-log 'current session' badge). TOTP 2FA is available (`/api/auth/2fa/*`, challenge tokens are single-use and rate-limited). Secrets via env: `JWT_SECRET` (≥32 bytes), `DB_URL/DB_USER/DB_PASSWORD`.
- **e2e scoping**: `pnpm --filter web e2e <file>.spec.ts` runs just that file (`scripts/e2e.mjs` strips the `--` separator pnpm forwards, so the `-- <file>` form also works). The full suite is currently 101 tests in 26 files (verify with `pnpm exec playwright test --list`). Local full runs need `docker compose up -d` (MySQL 3307) plus the admin seed env (`ADMIN_EMAIL=e2e-admin@hanbit.local ADMIN_PASSWORD='E2eAdmin1!' ADMIN_NAME=e2e관리자`). Also: `webServer` reuses whatever's already on ports 3000/8080 (`reuseExistingServer: true`) — never start a second `pnpm e2e`/`pnpm build` run before a prior one has fully finished, or the two runs contend for the same dev servers and produce large numbers of unrelated false failures (looks like a regression, isn't one).
- **Porting from `design-reference/`**: it uses Vite-isms that don't carry to Next.js — manual `useState` page routing (use Next App Router instead), a custom `theme-context` (consider `next-themes`, already a habit there), and a `figma:asset/` import resolver. Re-implement intent, don't copy config.
