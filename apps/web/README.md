# apps/web — 한빛교회 프론트엔드

Next.js (App Router) + TypeScript + Tailwind v4. 모노레포의 프론트엔드 패키지.

## 실행

루트에서 실행하는 것을 권장합니다(워크스페이스 스크립트):

```bash
pnpm install     # 루트에서 1회
pnpm dev:web     # = pnpm --filter web dev → http://localhost:3000
pnpm build:web   # 프로덕션 빌드
```

이 디렉터리에서 직접:

```bash
pnpm dev
pnpm build
pnpm lint
```

## 백엔드 연동

- **브라우저**: `NEXT_PUBLIC_API_URL`(기본 `http://localhost:8080`) — Web image build arg 로 bake-in.
- **SSR·Server Components**: `API_INTERNAL_URL`(런타임 env). Docker Compose 에서 `http://api:8080`. 미설정 시 `NEXT_PUBLIC_API_URL` fallback. `src/lib/api-url.ts` 참고.
- 인증: JWT 는 **httpOnly 쿠키**(`hanbit_token`)로만 전달되어 JS 에서 접근 불가. `localStorage` 에는 세션 마커·표시 이름만 저장(`src/lib/auth.ts`).

프로젝트 전체 구조·DB·환경 변수는 루트 [`README.md`](../../README.md) 참고.

## 운영 웹 이미지의 공개 설정

`NEXT_PUBLIC_*`는 Next 빌드 시 번들에 고정된다. 이미지 실행 시 환경변수를 변경해도 브라우저에 배포된 값은 바뀌지 않으므로, 설정을 바꾼 뒤에는 이미지를 다시 빌드해야 한다.

CD는 GitHub Repository **Variables**의 같은 이름을 Docker build arg로 전달한다. `.env.local`은 Docker 컨텍스트에서 제외되며 자동으로 전달되지 않는다. 아래 5개는 필수다.

| 변수 | 조건 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 브라우저에서 접근할 실제 API의 HTTPS origin. 경로·쿼리·끝 슬래시 없음 |
| `NEXT_PUBLIC_SITE_URL` | 공개 홈페이지의 HTTPS origin. 경로·쿼리·끝 슬래시 없음 |
| `NEXT_PUBLIC_CHURCH_NAME` | 실제 교회 표시명 |
| `NEXT_PUBLIC_CHURCH_ADDRESS` | 실제 교회 주소 |
| `NEXT_PUBLIC_CHURCH_PHONE` | 실제 연락 가능한 전화번호 |

영문명·목사명·이메일·지도 키·SNS·헌금 계좌/딥링크·Sentry 공개 설정은 `.env.example`의 `NEXT_PUBLIC_*` 목록과 같은 이름으로 선택 주입한다. 모든 값은 한 줄로 작성하고 **공개 가능한 값만** 넣는다. 비밀번호·JWT secret·Sentry 인증 토큰은 build arg에 넣지 않는다. `API_INTERNAL_URL`과 서버용 `SENTRY_DSN` 등 비공개 설정은 기존처럼 서버 런타임에서 관리한다.

`Dockerfile.prod`는 기본 `WEB_BUILD_MODE=production`이며, 의존성 설치와 Next 빌드 전에 `scripts/validate-build-config.mjs`를 실행한다. 필수 값 누락, HTTP/로컬/자리표시 URL, 예시 주소·전화번호는 빌드를 실패시킨다. 값의 형식과 알려진 자리표시 값만 검사하며 실제 주소의 소유권이나 연락 가능 여부를 외부 조회하지는 않는다.

- `cd.yml`: `production` 고정. 누락을 자리표시 값으로 대체하지 않는다. web 빌드가 실패하면 기존 `:main` 태그를 승격하지 않는다.
- `image-verify.yml`: `verification` 모드와 공개 fixture만 사용한다. 운영 설정 없이 Dockerfile을 검증하며 `push: false`다. 이 모드의 이미지를 운영에 배포하면 안 된다.
- 로컬 `pnpm dev`와 일반 `pnpm build`는 이 Docker 전용 검사를 강제하지 않아 기존 개발/CI 환경을 유지한다.

검증 스크립트는 명령행으로도 실행할 수 있다(필수 환경변수를 주입한 셸에서 실행).

```bash
node apps/web/scripts/validate-build-config.mjs
pnpm --filter web test src/lib/build-config.test.ts
```

`build-config.test.ts`는 검증 정책뿐 아니라 코드에서 사용하는 모든 `NEXT_PUBLIC_*`가 `.env.example`, Docker ARG/ENV, CD Variables 전달 경로에 있는지도 검사한다. 새 공개 설정을 추가하면 이 경로를 함께 갱신한다.
