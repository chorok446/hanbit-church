# 한빛교회 홈페이지

한빛교회 홈페이지. 커뮤니티 플랫폼 **다시,다(Dasida)** 를 포크해 교회 홈페이지로 리스킨한 프로젝트다. pnpm + Gradle 모노레포.

- 도메인 명칭: 캠페인 = "행사·사역", 피드 = "교제". 게시글 카테고리는 공지·주보·설교·나눔·기도이며, 게시글과 별개로 데일리 묵상(큐티)·기도벽(`/prayer`) 전용 화면이 있다.

## 주요 기능

- **게시글/카테고리**: 작성·수정·삭제, 이미지 다중 업로드(EXIF/GPS 자동 제거), 좋아요·북마크·댓글, 태그. 카테고리는 공지·주보·설교·나눔·기도(공지·주보는 관리자 전용 채널 — 상단 고정·예약 게시(취소·재예약 포함) 지원, 교제(/feed)는 나눔·기도만 노출). 설교·주보는 전용 아카이브 — 주보 `/bulletin`(주차별 카드·검색)은 상세에서 첨부 PDF 를 페이지 안에서 바로 여는 **인라인 뷰어** 제공
- **기도벽(`/prayer`)**: 기도제목(PRAYER) 전용 공간 — 익명 게시(작성자 마스킹 + 검색·프로필 유출 차단)·교인만 공개(비로그인 완전 비노출), 좋아요와 별개인 **'함께 기도했어요'** 반응(익명 집계·알림 없음) + 작성자·스태프의 **'응답받았어요'** 마킹
- **데일리 묵상(큐티)**: 관리자가 일별 '오늘의 말씀'(구절·본문)+묵상글을 등록하고 교인이 은혜나눔 댓글을 단다. 홈 '오늘의 말씀' 카드 + `/devotion` 아카이브·상세. 미래 날짜 등록분은 그날(KST) 자동 공개(예약 게시 개념 재사용, 별도 잡 불필요)
- **헌금 안내(`/giving`)**: 계좌번호·이체 메모 복사, 계좌이체용 QR, 카카오페이·토스 간편송금 딥링크. 계좌·링크 값은 env 로 주입하며 미설정 시 사무실 문의 안내로 폴백(링크 없는 송금 버튼은 숨김)
- **행사·사역**: 개설·모집 시작·참여/취소, 댓글, 참여자 목록·명단 CSV 내보내기(개설자 전용), 캘린더에 추가(.ics), 저장(북마크) 사용자 D-1 마감 임박 알림 배치. 모집중 정원 늘리기(증원·취소로 자리가 나면 북마커에게 자리 알림), 모집중 수정은 안내 정보만 허용(참여 조건 보호)
- **찬양팀**: 콘티(세트리스트) 아카이브, 일정 관리(지난 일정 포함 토글), 팀원 관리 — 찬양팀원(praiseRole)·관리자 전용 대시보드
- **소그룹/목장(구역)**: 목장 디렉터리·내 목장(`/cell-groups`, 로그인 교인 전용), 로스터 관리(후보 검색·전체 교체·새 멤버 합류 알림), 모임 스케줄·모임기록(참석 체크·나눔 노트). 그룹 생성·삭제·로스터 관리는 사역 스태프(ADMIN/OPERATOR/MINISTRY), 정보 수정·모임 기록은 담당 리더(목자)도 가능
- **캘린더**: 예배 반복 일정 + 행사 + 관리자 수동 일정 + 공휴일(2030년까지), iCal(.ics) 구독 피드
- **알림**: 타입별 필터 탭 + 안읽음 필터 AND 조합, 유형별 수신 설정(행사·댓글·좋아요), WebSocket 실시간 push, 새 기기 로그인 보안 알림
- **계정 보안**: 승인제 가입(+이용약관·개인정보 동의), 2단계 인증(TOTP), 접속 기록·현재 세션 표시, 원격 세션 로그아웃(개별/전체·비밀번호 변경 시 자동), 로그아웃 토큰 무효화(denylist)
- **계정 복구**: 관리자 임시 비밀번호 발급(1회 노출·강제 변경), 관리자 2FA 해제(인증앱 분실) — 이메일 인프라 없는 오프라인 본인 확인 전제
- **마이페이지**: 프로필 수정, 계정 설정(비밀번호/이메일 변경, 알림 설정), 접속 기록·세션 관리, 회원 탈퇴
- **검색/신고**: 통합 검색(게시글·행사·관련도 정렬·최근 검색어), 콘텐츠 신고. 회원 검색·프로필은 교인/관리자 전용
- **관리자**: 회원 승인·정지·역할, 신고 처리, 콘텐츠 숨김/복구(일괄 포함), 새가족 등록 관리, 통계 대시보드(가입·게시글·행사·신고·일별 활성 회원), 감사 로그
- **성능/SEO**: 홈·목록 ISR 선주입, 공개 GET ETag/304, gzip, React Compiler, 카톡 공유 OG 이미지·웹 매니페스트
- **품질/운영**: e2e 101개(axe 접근성 게이트 — 라이트/다크 × 공개/로그인/관리자/찬양팀 매트릭스 포함), Prometheus + Grafana 대시보드(compose --profile monitoring), Sentry(env 게이트), 시간대 KST 고정(UTC 컨테이너 안전)

## 기술 스택

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

### Backend

![Kotlin](https://img.shields.io/badge/Kotlin-2.4.10-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-437291?style=for-the-badge&logo=openjdk&logoColor=white)
![QueryDSL](https://img.shields.io/badge/QueryDSL-7.4.0-4479A1?style=for-the-badge)
![JJWT](https://img.shields.io/badge/JJWT-0.13.0-black?style=for-the-badge&logo=jsonwebtokens)
![Jackson](https://img.shields.io/badge/Jackson-3-232323?style=for-the-badge)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![JPA / Hibernate](https://img.shields.io/badge/JPA_%2F_Hibernate-59666C?style=for-the-badge&logo=hibernate&logoColor=white)

### Infra and Database

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Valkey](https://img.shields.io/badge/Valkey-8-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![H2](https://img.shields.io/badge/H2-0949BA?style=for-the-badge)
![Gradle](https://img.shields.io/badge/Gradle-9.6.1-02303A?style=for-the-badge&logo=gradle&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.9.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

## 구조

```
apps/web   # Next.js (App Router) + TypeScript + Tailwind v4 프론트엔드
apps/api   # Kotlin + Spring Boot 4.1 백엔드 (JWT 인증, MySQL/JPA)
packages/  # 공유 TS 패키지 (필요 시)
design-reference/  # 포크 원본 다시,다 Figma 익스포트(참고용, 디자인 기준 아님 — 기준은 모던 클래식 토큰)
```

- **프론트엔드**: `apps/web` — Next.js, 인증은 httpOnly 쿠키 기반(JWT 를 JS 에서 접근 불가).
- **백엔드**: `apps/api` — Kotlin/Spring Boot 4.1, JWT(jjwt) + Spring Security(stateless), MySQL 8(JPA/Hibernate). 테스트는 H2 인메모리(MySQL 모드)라 Docker 불필요.

## 로컬 실행

### Docker Compose (MySQL + Redis-compatible store + API + Web 한 번에)

로컬 개발용으로 MySQL, Redis-compatible store(Valkey), Spring Boot API, Next.js Web 을 컨테이너로 빌드·실행한다. **운영 배포용이 아니다.**

```bash
docker compose -f compose.local.yml up --build
```

| 서비스 | URL |
|--------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| MySQL | `localhost:3306` (DB `hanbit`, user `hanbit`) |
| Redis-compatible store | `localhost:6379` (compose 서비스명 `redis`, 이미지 `valkey/valkey`) |

- API 는 `local` 프로파일로 Valkey(`redis` 호스트)에 연결한다. 캐싱·세션·JWT 정책은 변경하지 않는다.
- rate limit 버킷 store 로 Valkey 를 사용한다(`app.rate-limit.store=redis`). 정책 상세는 아래 [Rate limit](#rate-limit) 및 [`apps/api/README.md`](apps/api/README.md) 참고.
- Redis 연결 smoke test(선택): compose 기동 후 `REDIS_SMOKE=true ./gradlew test --tests RedisCompatibleStoreConnectionTest` (`apps/api`)

- 종료: `Ctrl+C` 후 `docker compose -f compose.local.yml down` (DB 데이터는 volume `hanbit-mysql-data` 에 보존)
- volume까지 삭제: `docker compose -f compose.local.yml down -v`
- `compose.local.yml` 의 DB/JWT 값은 **로컬 전용 placeholder**이며 운영 secret 이 아니다.
- Web 컨테이너 SSR 은 compose 내부 `http://api:8080`(`API_INTERNAL_URL`)을, 브라우저는 `http://localhost:8080`(`NEXT_PUBLIC_API_URL`)을 사용한다. web 컨테이너 안에서 `127.0.0.1:8080`은 web 자신을 가리켜 API에 연결되지 않는다.

### DB 백업/복구

```bash
scripts/db-backup.sh            # backups/hanbit-<시각>.sql.gz 생성 (무중단, --single-transaction)
scripts/db-restore.sh backups/hanbit-20260711-000000.sql.gz          # 기본 DB(hanbit)에 복구
scripts/db-restore.sh backups/hanbit-20260711-000000.sql.gz 다른DB   # 다른 DB 로 복구(검증용)
```

복구는 기존 데이터를 덮어쓰므로 대상 DB 이름을 프롬프트에 다시 입력해야 진행된다. 컨테이너 이름·계정은 `DB_CONTAINER`/`DB_USER`/`DB_PASSWORD` env 로 바꿀 수 있다.

업로드 파일(이미지·주보 PDF·찬양팀 자료)은 DB 밖 디스크에 있어 별도로 백업한다:

```bash
scripts/uploads-backup.sh       # backups/uploads-<시각>.tar.gz (컨테이너 우선, 없으면 apps/api/uploads)
```

`compose.local.yml` 의 api 서비스는 `hanbit-api-uploads` 볼륨으로 업로드를 영속화한다 — 볼륨 없이 컨테이너를 재생성하면 업로드가 전부 사라진다.

### Production container images (Docker Hub)

로컬 개발은 `compose.local.yml` + `apps/*/Dockerfile` 을 그대로 사용한다. **운영 배포용 image** 는 `Dockerfile.prod` 로 빌드한다 — main PR 검증은 [`image-verify.yml`](.github/workflows/image-verify.yml), main push 배포 push 는 [`cd.yml`](.github/workflows/cd.yml). (기존 GHCR 계획에서 **Docker Hub**로 전환.)

| 이벤트 | 동작 |
|--------|------|
| `develop` 대상 PR | CI(web/api/e2e) 통과 시 **auto-merge** |
| `main` 대상 PR | **develop → main 만 허용** (`main PR source gate`). image build 검증. **수동 merge** |
| `main` push | **CI 성공 후에만** `docker.io/<DOCKERHUB_USERNAME>/hanbit-api`, `hanbit-web` push (`sha-<shortsha>`, `main` tag) |

**브랜치 흐름**: 기능 브랜치 → `develop` PR (CI 통과 시 auto-merge) → 릴리스 시 `develop` → `main` PR (수동 merge). `feat/*` 등을 `main` 으로 직접 PR 하면 CI 가 거부한다.

실제 서버 배포는 아직 미구현 — `cd.yml` 은 image push 까지만 수행한다. **amd64 VM 배포 runbook** [`single-vm-production-deploy-runbook.md`](apps/api/docs/backend/single-vm-production-deploy-runbook.md), **MySQL backup/restore** [`mysql-backup-restore-runbook.md`](apps/api/docs/backend/mysql-backup-restore-runbook.md). Docker Hub·Nginx는 [`container-images.md`](apps/api/docs/backend/container-images.md), [`nginx-reverse-proxy-deployment.md`](apps/api/docs/backend/nginx-reverse-proxy-deployment.md).

**main merge 전** GitHub Secrets/Variables·Docker Hub·prod 환경·배포 전략 준비는 [`main-release-readiness.md`](apps/api/docs/backend/main-release-readiness.md) 체크리스트를 따른다. Secrets/Environment 상세는 [`github-secrets-and-environments.md`](apps/api/docs/backend/github-secrets-and-environments.md), 운영 값 수집은 [`production-env-values-template.md`](apps/api/docs/backend/production-env-values-template.md). 운영 VM compose **예시 template** 은 [`deploy/compose.prod.example.yml`](deploy/compose.prod.example.yml) 참고.

### 호스트에서 직접 실행 (기존 방식)

#### 1. 의존성 설치

```bash
pnpm install        # JS 워크스페이스(web + packages). apps/api 는 Gradle 전용.
```

#### 2. DB 실행 (백엔드용)

```bash
docker compose up -d   # 루트 docker-compose.yml 의 MySQL 8
```

#### 3. 개발 서버

```bash
pnpm dev:web        # Next.js dev (http://localhost:3000)
pnpm dev:api        # Spring Boot (http://localhost:8080)
```

## 환경 변수

| 변수 | 대상 | 설명 |
|------|------|------|
| `JWT_SECRET` | api | JWT 서명 시크릿(최소 32바이트). prod 에서는 필수 — 미설정 시 기동 실패. |
| `JWT_TTL_MS` | api | access token 만료(ms). 기본 1800000(30분). 만료 시 refresh 로 재발급. |
| `JWT_REFRESH_TTL_MS` | api | refresh token 만료(ms). 기본 1209600000(14일). httpOnly 쿠키(`hanbit_refresh`, `Path=/api/auth`)로만 전달, rotation 적용. |
| `JWT_COOKIE_SECURE` | api | 인증 쿠키 `Secure` 속성. 로컬 http 는 `false`(기본), HTTPS 운영은 `true`. |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | api | MySQL 접속 정보. 기본은 docker-compose 값. |
| `SPRING_DATA_REDIS_HOST` / `SPRING_DATA_REDIS_PORT` | api | Redis-compatible store 접속(compose `local` 프로파일). 기본 `localhost:6379`. |
| `APP_RATE_LIMIT_*` / `app.rate-limit.*` | api | rate limit 정책·store. 기본 `memory`, compose `local` 은 `redis`. 상세는 [Rate limit](#rate-limit) 참고. |
| `APP_CORS_ALLOWED_ORIGINS` | api | **prod 필수.** 허용할 프론트 origin(comma-separated). prod 에서 미설정/`*`/localhost 면 기동 실패. |
| `NEXT_PUBLIC_API_URL` | web | 브라우저(클라이언트) fetch용 API 베이스 URL. Web image build arg 로 bake-in. 기본 `http://localhost:8080`. |
| `API_INTERNAL_URL` | web (런타임) | SSR·Server Components용 API 베이스 URL. Docker Compose 에서 `http://api:8080` 등 내부 DNS. 미설정 시 `NEXT_PUBLIC_API_URL` fallback. 클라이언트 번들에 노출하지 않음. |
| `NEXT_PUBLIC_CHURCH_BANK` / `NEXT_PUBLIC_CHURCH_ACCOUNT` / `NEXT_PUBLIC_CHURCH_ACCOUNT_HOLDER` | web | `/giving` 헌금 계좌 안내(은행·계좌번호·예금주). 은행·계좌가 비면 계좌 카드 대신 사무실 문의 안내로 폴백. |
| `NEXT_PUBLIC_CHURCH_KAKAOPAY` / `NEXT_PUBLIC_CHURCH_TOSS` | web | `/giving` 카카오페이·토스 간편송금 딥링크(전체 URL). 미설정 시 해당 송금 버튼을 렌더하지 않음. |

## 빌드

```bash
pnpm build:web      # Next.js 프로덕션 빌드
pnpm build:api      # gradlew build
```

## 테스트 / 검증

```bash
# 프론트
pnpm --filter web lint
pnpm --filter web build

# 백엔드
cd apps/api
./gradlew test --no-daemon
./gradlew build --no-daemon
```

## API 문서 (OpenAPI / Swagger)

백엔드 API 명세는 `springdoc-openapi` 로 코드에서 자동 생성된다. `pnpm dev:api` 실행 후 확인한다.

- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

인증 필수 API 는 문서에서 `bearerAuth` 자물쇠로 표시되며, Swagger UI 의 **Authorize** 에 로그인/회원가입으로 받은 JWT 를 입력해 호출한다. 자세한 내용은 [`apps/api/README.md`](apps/api/README.md) 참고.

> 노출 정책: local/dev/test 에서는 문서가 열려 있고, **`prod` 프로파일에서는 springdoc(api-docs·swagger-ui)을 비활성화**해 외부에 노출되지 않는다.

## CORS 설정

CORS 는 `app.cors.*` property(`CorsProperties`)로 관리하며 `/api/**` 에 적용된다.

로컬 개발 환경에서는 Next.js 개발 서버를 위해 다음 origin 을 허용한다.

- `http://localhost:3000`
- `http://127.0.0.1:3000`

운영 환경(`prod`)에서는 `APP_CORS_ALLOWED_ORIGINS` 를 반드시 명시해야 하며, `*`(wildcard)와 localhost 는 허용하지 않는다(미설정/위반 시 기동 실패).

```bash
APP_CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
```

프론트는 JWT 를 httpOnly 쿠키로 주고받으므로 credentials 를 허용하며, `Authorization`/`Content-Type` 헤더도 허용한다(Bearer 호출도 지원). CORS 허용은 브라우저 origin 정책일 뿐 **인증을 우회하지 않는다** — 인증이 필요한 API 는 여전히 JWT Bearer 토큰이 필요하다.

## 헬스 체크 / Actuator 노출 정책

외부에 공개되는 Actuator endpoint 는 헬스체크용 `/actuator/health` 로 제한한다. 로드밸런서/배포 헬스체크는 이 경로를 사용한다.

- 공개: `GET /actuator/health` (SecurityConfig 에서 이 경로만 permitAll)
- 미노출: `/actuator/env`, `/actuator/beans`, `/actuator/configprops`, `/actuator/mappings`, `/actuator/metrics`, `/actuator/loggers` 등 (web exposure 를 `health` 로만 제한)
- `health` 응답에 `details`/`components` 는 노출하지 않는다 (`management.endpoint.health.show-details=never`).
- `prometheus` 는 메트릭이 실려 **기본 비공개** — 스크레이프가 필요한 환경(로컬 모니터링 등)만 `MANAGEMENT_ENDPOINTS=health,prometheus` 로 opt-in 하고, 그 경우에도 리버스 프록시·네트워크 격리로 보호한다.

liveness/readiness probe 는 현재 사용하지 않으며, 배포 환경이 확정된 뒤 별도 PR 에서 검토한다.

## Rate limit

특정 mutation endpoint 에 **클라이언트 IP 기준 fixed-window** rate limit 을 적용한다(로그인은 계정(email)당 한도 추가). 글로벌 API rate limit 은 없다.

| Endpoint | limit / window |
|----------|----------------|
| `POST /api/auth/login` | IP 20 / 60초 + 계정(email)당 10 / 60초 |
| `POST /api/auth/2fa/verify` | 로그인 IP 버킷 공유 (2FA 코드 무차별 대입 방지) |
| `POST /api/auth/signup` | 10 / 60초 |
| `POST /api/posts`, `POST /api/events` (본문 생성) | 30 / 60초 (공유 버킷) |
| `POST /api/posts/{id}/comments`, `/api/events/{id}/comments`, `.../proofs` | 20 / 60초 (댓글·참여 후기 공유 버킷) |
| `POST /api/reports`, `POST /api/new-family` | 10 / 60초 (공유 버킷) |
| `POST /api/media`, `/api/media/document`, `/api/praise/files` (업로드) | 10 / 60초 (공유 버킷) |
| 좋아요·북마크·참여·차단 토글 POST | 60 / 60초 (공유 버킷) |

- **초과 응답**: HTTP `429`, `Retry-After` 헤더, Spring 기본 `/error` JSON body
- **Redis key prefix**: `rate-limit:` + `auth:login:ip:`·`auth:login:account:`·`auth:signup:ip:`·`comment:create:ip:`·`report:create:ip:`·`media:upload:ip:`·`content:create:ip:`·`interaction:toggle:ip:` + `{clientIp}`(계정 버킷만 email 기준)
- **store**: 기본·테스트는 `memory`(`app.rate-limit.store=memory`). compose local(`SPRING_PROFILES_ACTIVE=local`)은 Valkey(`valkey/valkey:8`, compose 서비스명 `redis`)에 `app.rate-limit.store=redis` 로 연결한다.

endpoint·property·회귀 테스트 상세는 [`apps/api/README.md`](apps/api/README.md#rate-limit) 참고.
