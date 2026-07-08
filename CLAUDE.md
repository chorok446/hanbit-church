# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**철마제일교회 홈페이지** — 다시다(dasida) 커뮤니티 플랫폼을 포크해 교회 홈페이지로 리스킨한 프로젝트. pnpm + Gradle monorepo. upstream 리모트가 원본(dasida)을 가리키며, 필요한 개선만 체리픽한다.

- **디자인 방향(모던 클래식)**: 크림 `#faf8f3` + 딥네이비 `#1f2a44` + 골드 `#c9a227`. 제목·성경구절은 명조(`--font-display` = Noto Serif KR, `next/font` 주입), 본문은 Noto Sans KR(`--font-body`). 골드는 라벨·아이콘·구분선 같은 "한 줄"에만 쓰고 큰 면 금지. CTA 버튼은 `--cta-bg`/`--cta-fg`(라이트: 네이비/크림, 다크: 골드/미드나잇).
- **도메인 명칭**: 캠페인 = "행사·사역", 피드 = "교제". 교회 기본 정보(이름·주소·예배 시간표·월별 말씀)는 `apps/web/src/data/church.ts` 한 파일에서 관리하며 `TODO(교회 확인)` 표시된 값은 자리표시다.
- **정적 페이지**: `/about`(교회소개) `/worship`(예배안내) `/welcome`(새가족). 홈은 ChurchHero(월별 말씀) → WorshipSummary → HomeCommunity 구성.

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind v4 → `apps/web`
- **Backend**: Kotlin + Spring Boot 4.1 (Gradle Kotlin DSL, Kotlin 2.4) → `apps/api`
- **DB**: MySQL 8 via JPA/Hibernate (introduced for JWT auth persistence). Local DB runs from `docker-compose.yml` at root (`docker compose up -d`). Domains (posts/campaigns/notifications/users) are JPA entities; list/nested fields are stored as JSON columns. Seed data loads once into empty tables via `SeedRunner`. Tests run on in-memory H2 (MySQL mode), no Docker needed. QueryDSL (openfeign fork) is wired via kapt.
- **`design-reference/`**: 원본 다시다의 Figma export. 교회 프로젝트에서는 참고용일 뿐 디자인 기준이 아니다 — 디자인 기준은 위 모던 클래식 토큰.

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
- **Auth**: JWT (jjwt) + Spring Security, stateless. Tokens ride **httpOnly cookies** — access `dasida_token`, refresh `dasida_refresh` (rotation, `Path=/api/auth`); `Authorization: Bearer` is also accepted. Most `GET /api/**` are public, but per-user GETs (`/api/auth/me`, `/api/posts/mine`, `/api/notifications/**`, …) require auth — see `SecurityConfig.kt`. Frontend keeps only a session marker in `localStorage` (`apps/web/src/lib/auth.ts`); the JWT is never readable from JS. Secrets via env: `JWT_SECRET` (≥32 bytes), `DB_URL/DB_USER/DB_PASSWORD`.
- **Admin**: `users.role` (`USER`/`ADMIN`) drives authorization — `JwtAuthFilter` reads the role from DB per request (no JWT claim), so revoking admin applies immediately. All of `/api/admin/**` requires `ROLE_ADMIN` (`AdminController`: report queue + summary + content visibility). Frontend `/admin` is guarded client-side (`admin-guard.tsx`, non-admins get 404). Bootstrap admin account is seeded by `SeedRunner` **only when `ADMIN_PASSWORD` is set** (no built-in default password); `ADMIN_EMAIL` defaults to `admin@dasida.local`. An existing user with that email is promoted, not overwritten.
- **Content hiding (soft hide)**: posts/campaigns/comments carry `hiddenAt`/`hiddenReason` (`AdminContentService` sets them; report resolution can hide via `hideContent`). Hidden content is excluded from public lists/search/sitemap and interactions 404; the **author still sees it** on detail/mine with `hidden: true` (SSR detail pages 404 though — no cookie server-side). When adding a new public read path for these entities, filter `hiddenAt is null`; hiding/unhiding a post comment must keep `post.comments` counter in sync (already handled — don't double-decrement on delete).
- **e2e scoping**: `pnpm --filter web e2e <file>.spec.ts` runs just that file (`scripts/e2e.mjs` strips the `--` separator pnpm forwards, so the `-- <file>` form works too). The full suite is currently 41 tests, ~1.5min. Also: `webServer` reuses whatever's already on ports 3000/8080 (`reuseExistingServer: true`) — never start a second `pnpm e2e`/`pnpm build` run before a prior one has fully finished, or the two runs contend for the same dev servers and produce large numbers of unrelated false failures (looks like a regression, isn't one).
- **Porting from `design-reference/`**: it uses Vite-isms that don't carry to Next.js — manual `useState` page routing (use Next App Router instead), a custom `theme-context` (consider `next-themes`, already a habit there), and a `figma:asset/` import resolver. Re-implement intent, don't copy config.
- **Theme colors — CSS tokens only, no `dark ?` ternaries**: `globals.css` defines all theme tokens (`--surface`, `--card`, `--panel`, `--glass`, `--border`, `--foreground`, `--foreground-muted`, `--heading`, `--accent`, `--accent-secondary`, `--accent-strong`, `--accent-soft`, `--danger`, `--danger-soft`, `--page-gradient`, `--auth-gradient`) plus RGB channels for arbitrary alpha (`rgba(var(--ink-rgb), a)` for text/tints, `rgba(var(--surface-rgb), a)` for translucent fixed bars). The `dark ? "..." : "..."` color-ternary migration is **done** — do not reintroduce ternaries or use `useTheme` for colors; the only remaining `dark` usage is `theme-toggle.tsx` (icon/label/position, not color).
