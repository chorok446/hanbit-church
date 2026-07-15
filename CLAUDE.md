# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **응답 언어: 항상 한국어로 답변한다.** (사용자 지시 — 코드/식별자/커밋 메시지 컨벤션은 그대로 두되, 설명·요약·질문 등 사용자에게 보이는 산문은 한국어로.)

## Project

**한빛교회 홈페이지** — 다시다(dasida) 커뮤니티 플랫폼을 포크해 교회 홈페이지로 리스킨한 프로젝트. pnpm + Gradle monorepo. upstream 리모트가 원본(dasida)을 가리키며, 필요한 개선만 체리픽한다.

- **디자인 방향(모던 클래식)**: 크림 `#faf8f3` + 딥네이비 `#1f2a44` + 골드 `#c9a227`. 제목·성경구절은 명조(`--font-display` = Noto Serif KR, `next/font` 주입), 본문은 Noto Sans KR(`--font-body`). 골드는 라벨·아이콘·구분선 같은 "한 줄"에만 쓰고 큰 면 금지. CTA 버튼은 `--cta-bg`/`--cta-fg`(라이트: 네이비/크림, 다크: 골드/미드나잇). 클릭형 카드 hover 는 공통 클래스 `.card-lift`, 홈 섹션 등장 모션은 `ScrollReveal`/`StaggerItem` 공통 컴포넌트를 재사용한다(개별 구현 금지).
- **도메인 명칭**: 캠페인 = "행사·사역", 피드 = "교제". 교회 기본 정보(이름·주소·예배 시간표·월별 말씀)는 `apps/web/src/data/church.ts` 한 파일에서 관리하며 `TODO(교회 확인)` 표시된 값은 자리표시다.
- **정적 페이지**: `/about`(교회소개) `/worship`(예배안내) `/welcome`(새가족) `/giving`(헌금 안내) `/privacy`(개인정보처리방침) `/terms`(이용약관 — 가입 시 동의 필수). 홈은 ChurchHero(월별 말씀) → WorshipSummary → HomeCommunity 구성.
- **캘린더**: 행사(Event) + 예배 반복(church.ts) + 관리자 수동 일정(`manual_calendar_events`, `/admin/calendar` 관리·`GET /api/calendar` 공개) + 공휴일 정적 테이블(2030년까지). iCal 구독은 `GET /api/calendar/ics`.

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind v4 → `apps/web`
- **Backend**: Kotlin + Spring Boot 4.1 (Gradle Kotlin DSL, Kotlin 2.4) → `apps/api`
- **DB**: MySQL 8 via JPA/Hibernate (introduced for JWT auth persistence). Local DB runs from `docker-compose.yml` at root (`docker compose up -d`). Domains (posts/events/notifications/users) are JPA entities; list/nested fields are stored as JSON columns. Seed data loads once into empty tables via `SeedRunner`. 스키마는 **Flyway 마이그레이션**(`db/migration/V*.sql`, hibernate validate 모드) — 엔티티 컬럼을 추가하면 반드시 마이그레이션도 추가한다. 마이그레이션 파일명/내용 변경 시 기존 로컬 볼륨은 `docker compose down -v` 로 재생성. Tests run on in-memory H2 (MySQL mode), no Docker needed. QueryDSL (openfeign fork) is wired via kapt.
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
- **Auth**: JWT (jjwt) + Spring Security, stateless. Tokens ride **httpOnly cookies** — access `hanbit_token`, refresh `hanbit_refresh` (rotation, `Path=/api/auth`); `Authorization: Bearer` is also accepted. Most `GET /api/**` are public, but per-user GETs (`/api/auth/me`, `/api/posts/mine`, `/api/notifications/**`, …) require auth — see `SecurityConfig.kt`. Frontend keeps only a session marker in `localStorage` (`apps/web/src/lib/auth.ts`); the JWT is never readable from JS. 토큰에는 세션 식별자 `sid` claim 이 있어 refresh 회전·계정 변경 재발급에도 유지된다(접속 기록 '현재 세션' 표시). **2FA(TOTP)**: `users.totp_*` — 활성 사용자는 로그인 시 challengeToken(typ=2fa, 5분·1회용)을 받고 `/api/auth/2fa/verify` 로 완료. verify 는 로그인 IP rate limit 버킷을 공유한다. **세션 관리·계정 복구**: 원격 세션 로그아웃은 sid 를 토큰 denylist(`sid:` 접두사 키)에 올려 access·refresh(rotation 포함)를 함께 차단한다(`DELETE /api/auth/sessions/{sid}`, 전체는 `DELETE /api/auth/sessions`); 비밀번호 변경 성공 시 현재 세션만 남기고 자동 해지된다. 잠금 복구는 관리자 경로: 비밀번호 초기화(`POST /api/admin/users/{id}/password-reset` — 임시 비밀번호 1회 노출 + `password_reset_required` 강제 변경 플래그)와 2FA 해제(`DELETE /api/admin/users/{id}/two-factor`) — 둘 다 관리자 계정은 대상 불가(400). Secrets via env: `JWT_SECRET` (≥32 bytes), `DB_URL/DB_USER/DB_PASSWORD`.
- **Roles & admin**: `users.role` is one of `USER/ADMIN/OPERATOR/MINISTRY/NEW_FAMILY/CONTENT` (`UserRole` in `User.kt`) — `JwtAuthFilter` reads it from DB per request (no JWT claim), so revocation applies immediately. `/api/admin/**` is role-segmented in `SecurityConfig.kt` (reports/approvals=ADMIN·OPERATOR, new-family=+NEW_FAMILY, summary/stats=all staff, logs·role-change·suspension=ADMIN only). 공지·주보(NOTICE/BULLETIN) posts + `/api/media/document` require ADMIN/OPERATOR/CONTENT. Frontend mirrors this in `apps/web/src/app/admin/permissions.ts` (`rolePermissions`, `isStaffRole`) — keep both in sync. Bootstrap admin is seeded by `SeedRunner` **only when `ADMIN_PASSWORD` is set**; `ADMIN_EMAIL` defaults to `admin@hanbit.local`.
- **Signup approval (승인제)**: new signups are pending (`users.approved_at IS NULL`) until an admin approves (`/api/admin/users/pending|approve|reject`, UI `/admin/approvals`). Pending users can't log in/refresh (403 with Korean detail) and are excluded from the admin user list and the 활동 회원 count. Controlled by `app.signup.require-approval` (default true; **false in backend tests** so signup→token flows keep working; e2e handles it via an admin-approve helper using the locally-seeded `e2e-admin@hanbit.local`/`E2eAdmin1!` account — seed it in fresh environments).
- **Feature flags**: DM REST API is off (`app.features.dm=false`, controller `@ConditionalOnProperty`; frontend DM UI is removed; `/ws/messages` WebSocket stays for notification push). Event(행사·사역) creation can be limited to staff via `app.events.staff-only-create` (default false to keep e2e green — enable in production). 행사 수정 규칙: upcoming=전체 수정, **open=안내 정보만**(제목·모집/진행 기간·정원 변경은 409 — 참여자가 신청한 조건 보호, 수정 시 참여자에게 EVENT_DETAILS_UPDATED 팬아웃), closed=수정 불가. 게시글·행사 모두 본문 수정 시 `updated_at`('수정됨' 표시)이 찍히며 고정·숨김·예약 전환 같은 메타 변경은 찍지 않는다.
- **Post categories**: 공지·주보 are admin-only-writable official channels (no likes/reports in UI, PDF `attachments` up to 3×10MB via `/api/media/document`); 교제(/feed) only shows 나눔·기도(`category=SHARING,PRAYER` — the search API accepts comma-separated categories); 설교 has a dedicated archive UI (`sermon-list`/`sermon-detail`, parsing layer in `src/data/sermons.ts`). Post detail views are counted (`posts.views`, incremented per detail GET). 기도(PRAYER)는 익명 게시(`posts.anonymous` — 응답에서 작성자 마스킹, 이름검색·프로필·postCount 제외)와 교인만 공개(`posts.visibility=MEMBERS` — 비로그인은 목록·검색·상세·댓글·sitemap 전부 제외)를 지원하며 둘 다 기도 카테고리 밖으로 나갈 수 없다. 공지·주보는 **상단 고정**(`posts.pinned_at` — LATEST 정렬에서만 pinned 우선, 스태프 토글 `PATCH /api/posts/{id}/pin`)과 **예약 게시**(`posts.publish_at` + `hiddenAt`/`hiddenReason='예약 게시 대기'` 마커 재사용, `ScheduledPublishJob` 1분 주기 공개 전환 + seq 갱신)를 지원한다. 알림은 유형별 수신 설정(`users.notify_comments/notify_likes` — `NotificationService.notify()` 게이트; 보안·운영 알림은 `notifyUser` 경로라 뮤트 불가)이 있다.
- **Content hiding (soft hide)**: posts/events/comments carry `hiddenAt`/`hiddenReason` (`AdminContentService` sets them; report resolution can hide via `hideContent`). Hidden content is excluded from public lists/search/sitemap and interactions 404; the **author still sees it** on detail/mine with `hidden: true` (SSR 상세도 동작 — `lib/api-server.ts`의 `apiGetOrNullWithCookies`가 요청 쿠키를 API 로 전달한다). When adding a new public read path for these entities, filter `hiddenAt is null`; hiding/unhiding a post comment must keep `post.comments` counter in sync (already handled — don't double-decrement on delete). **예약 게시가 이 숨김 차원을 재사용**하므로(hiddenReason 마커로 구분) hidden 필터만 지키면 예약 글 제외도 자동으로 맞는다. 관리자 일괄 숨김/복구는 `PATCH /api/admin/content/bulk`(항목별 프록시 호출 — 감사 로그·알림 단건과 동일).
- **e2e scoping**: `pnpm --filter web e2e <file>.spec.ts` runs just that file (`scripts/e2e.mjs` strips the `--` separator pnpm forwards, so the `-- <file>` form works too). The full suite is currently 94 tests in 23 files (`pnpm exec playwright test --list` 로 확인). 로컬 전체 실행은 `docker compose up -d`(MySQL 3307) 후 `ADMIN_EMAIL=e2e-admin@hanbit.local ADMIN_PASSWORD='E2eAdmin1!' ADMIN_NAME=e2e관리자` env 로 admin 시드를 보장해야 한다. Also: `webServer` reuses whatever's already on ports 3000/8080 (`reuseExistingServer: true`) — never start a second `pnpm e2e`/`pnpm build` run before a prior one has fully finished, or the two runs contend for the same dev servers and produce large numbers of unrelated false failures (looks like a regression, isn't one).
- **업로드 이미지 메타데이터 제거**: `MediaUploadService`는 jpg/png 를 크기와 무관하게 항상 재인코딩하고(EXIF GPS·기기정보 소거, jpg 품질 0.85 명시), webp 은 디코더가 없어 RIFF 청크에서 EXIF/XMP 만 떼어낸다(`stripWebpMetadata`, 파싱 실패 시 원본 유지). 디코딩 실패(손상 파일)만 원본 저장.
- **행사 내보내기**: 참가자 CSV(`GET /api/events/{id}/participants/export`, 개설자 전용)는 이름·인증만 담고(연락처 미포함 — 회원 열거 차단 정책) UTF-8 BOM + RFC 4180 + 수식 선행문자(`= + - @` 탭) 무력화를 지킨다. 단건 일정 파일은 `GET /api/events/{id}/ics`(공개, 숨김 404) — 구독 피드(`/api/calendar/ics`)와 VEVENT 빌더를 공유한다.
- **테스트 함정**: H2 는 한 문장의 다중 `ADD COLUMN` 에서 DEFAULT 를 잃는다 — 마이그레이션은 컬럼당 한 문장으로. Jackson 3 은 `JsonNode.map` 이 자체 메서드라 Kotlin `Iterable.map` 확장을 가린다 — 테스트에서 배열 노드는 `toList()` 후 순회. `TestUserSeed` 는 raw insert 라 users 새 컬럼을 명시해야 한다. Post 생성자는 위치 기반 시드 호출과의 호환을 위해 **새 필드를 꼬리에** 추가한다.
- **페이지네이션 클라이언트 규칙**: 항목 처리(복구·취소 등)로 현재 페이지가 빌 수 있는 목록 UI 는 `emptyPageFallback`(`lib/paginated-section-utils.ts`)으로 직전 페이지 자동 폴백을 넣는다 — 빠뜨리면 마지막 페이지 처리 후 거짓 빈 화면에 갇힌다(관리자 콘텐츠 관리에서 실제 발생, PR #155).
- **PR/CI**: develop 대상 PR 은 CI 그린 시 auto-merge 잡이 자동 머지하지만 **dependabot PR 에는 SKIPPED** — 수동 판단·머지가 필요하다. Kotlin 플러그인(jvm·kapt·spring·jpa) 버전은 넷을 항상 함께 올린다. eslint 10·TypeScript 7 메이저는 eslint-config-next 지원 전까지 보류(TS 7 은 CI 빨강 확인됨).
- **ISR 선주입 패턴**: 홈·설교·소식·행사 목록은 서버가 첫 페이지를 `apiGetIsr`(60s)로 선주입하고 클라이언트가 시드로 재사용한다(중복 fetch 가드). API 없는 빌드에선 null 폴백. 'use client' 모듈에서 export 한 상수를 서버 컴포넌트가 import 하면 클라이언트 참조 프록시가 되므로 공유 상수는 `data/posts.ts` 같은 서버 안전 모듈에 둔다.
- **Porting from `design-reference/`**: it uses Vite-isms that don't carry to Next.js — manual `useState` page routing (use Next App Router instead), a custom `theme-context` (consider `next-themes`, already a habit there), and a `figma:asset/` import resolver. Re-implement intent, don't copy config.
- **Theme colors — CSS tokens only, no `dark ?` ternaries**: `globals.css` defines all theme tokens (`--surface`, `--card`, `--panel`, `--glass`, `--border`, `--foreground`, `--foreground-muted`, `--heading`, `--accent`, `--accent-secondary`, `--accent-strong`, `--accent-soft`, `--danger`, `--danger-soft`, `--page-gradient`, `--auth-gradient`) plus RGB channels for arbitrary alpha (`rgba(var(--ink-rgb), a)` for text/tints, `rgba(var(--surface-rgb), a)` for translucent fixed bars). The `dark ? "..." : "..."` color-ternary migration is **done** — do not reintroduce ternaries or use `useTheme` for colors; the only remaining `dark` usage is `theme-toggle.tsx` (icon/label/position, not color).
