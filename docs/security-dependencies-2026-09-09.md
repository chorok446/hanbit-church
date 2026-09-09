# 의존성 보안 패치 — 2026-09-09

기준: PR #267 머지 후 `origin/develop`의 `94ce8914`.
범위: 루트 `pnpm-lock.yaml`이 관리하는 웹 워크스페이스(운영·개발·선택 의존성).
별도 `design-reference/`, JVM/OS/컨테이너 이미지 취약점 전수 검사는 이 결과에 포함하지 않는다.

## 결과와 변경

`pnpm audit`에서 **25건(critical 2 / high 18 / moderate 5) → 알려진 취약점 0건**.
취약점 무시 목록이나 강제 메이저 업그레이드는 사용하지 않았다.

| 구성 요소 | 이전 lockfile | 패치 후 lockfile | 주요 경로 |
| --- | --- | --- | --- |
| Next.js / eslint-config-next | 16.2.12 | 16.3.3 | 웹 서버·이미지 최적화·린트 |
| Sharp | 0.34.5 | 0.35.4 | Next.js 이미지 처리의 libvips/libheif |
| Tiptap core | 3.29.2 | 3.30.5 | 게시글 에디터 |
| DOMPurify | 3.4.12 | 3.4.15 | `sanitizeRichHtml`의 HTML 정화 |
| Vitest / mocker | 4.1.10 | 4.1.11 | 테스트 실행·mock 파일 접근 |
| js-yaml | 4.2.0 / 4.3.0 | 4.3.2 | OpenAPI 타입 생성·ESLint |
| brace-expansion | 1.1.16 / 2.1.2 / 5.0.7 / 5.0.8 | 1.1.18 / 2.1.4 / 5.0.9 | 린트·빌드 glob |
| fast-uri / nanoid | 3.1.4 / 3.3.16 | 3.1.7 / 3.3.18 | 빌드 스키마·PostCSS |
| PostCSS | 8.5.20 / 8.5.25 | 8.5.23 / 8.5.28 | Next.js·Tailwind 빌드 |

- Next.js와 ESLint 설정 버전을 함께 올리고, 직접 사용하는 Tiptap 패키지의 최소 버전을 맞췄다.
- `@redocly/openapi-core`의 js-yaml 고정 버전은 취약한 4.x 범위에만 override를 적용했다. 기존 PostCSS override도 새 패치 하한으로 갱신했다.
- 일반 입력·이미지·에디터·HTML 출력과 빌드/타입 생성이 검토 대상 경계다. Windows 전용 Next.js 취약점은 Linux 배포에 직접 해당하지 않지만 같은 패치로 제거된다. 이미지 처리·에디터 의존성은 실제 사용 경로가 있어 우선 갱신했다.
- Tiptap StarterKit의 기본 Link와 앱의 명시적 Link 설정이 중복되는 경고를 재현하고, 기본 Link만 비활성화했다. 앱의 URL·target·rel 설정은 유지한다.
- 인증·권한·CORS·업로드 한도·실제 계정·DB·Repository Variables는 변경하지 않았다.

## 재발 방지

- CI의 `pnpm audit --audit-level=high` 실패 무시를 제거했다. 레지스트리 오류도 성공으로 간주하지 않는다.
- 자동 머지의 `needs`에 `security`를 추가했다. high 이상 취약점 또는 감사 오류가 있으면 자동 머지가 차단된다.
- pnpm 11.9.0과 고정 lockfile 설치를 유지하고 `strictDepBuilds: true`를 명시했다. 설치 스크립트 전체 허용은 하지 않는다.
- `security-pipeline.test.ts`: 감사 실패 무시 금지·자동 머지 의존성·설치 정책 가드.
- `openapi-compatibility.test.ts`: YAML 참조 해소와 TypeScript 타입 생성 확인.
- `rich-text-editor.test.tsx`: 실제 에디터 초기화 시 링크 중복 등록 회귀 방지.
- override 제거 기준: 상위 패키지의 제약이 안전한 버전을 허용한 뒤 해당 override를 제거하고 lockfile을 다시 생성한다. `pnpm audit --audit-level=low`, OpenAPI 타입 생성 회귀 테스트, 타입 검사와 프로덕션 빌드를 통과한 경우에만 제거를 확정한다.

## 검증

- `pnpm audit --audit-level=low`: 알려진 취약점 없음.
- `pnpm audit signatures`: 829개 패키지 레지스트리 서명 검증 통과. 이는 악성 패키지 부재를 보증하는 검사는 아니다.
- 설치 스크립트 실행을 차단해 먼저 설치한 후, 실제 postinstall 소스를 검토했다. 빈 임시 디렉터리에서 `pnpm install --frozen-lockfile`도 통과했고 기존 허용 목록의 Sentry CLI·unrs-resolver만 postinstall을 실행했다.
- 웹 전체 테스트: 55파일, 365개 통과. 보안 게이트 2건과 에디터 중복 등록 1건은 수정 전 실패도 확인했다.
- TypeScript 검사와 actionlint 통과. ESLint 오류 0, 경고 1: 기존 소그룹 삭제 후 `window.location.href` 이동을 Next.js의 새 규칙이 지적한다. 이 보안 패치에서는 해당 화면 동작을 바꾸지 않았다.
- 기존 `openapi-typescript@7.13.0`의 TypeScript `^5.x` peer 경고는 남아 있다. 프로젝트의 TypeScript 6을 유지했고, 실제 YAML→타입 생성 회귀 테스트와 전체 타입 검사를 통과했다.
- 최종 프로덕션 빌드: Next.js 16.3.3, 정적 페이지 45개 생성 통과. 로컬 API fixture와 운영 서비스를 분리해 검증했다.
- 격리 Chrome에서 실제 에디터 입력·굵게·임시 저장 복원·링크 적용·미리보기를 확인했다. 미리보기의 `target="_blank"`, `rel="noopener noreferrer"`가 유지되고 콘솔 오류·경고가 없다. 게시글은 발행하지 않았다.
- 패치된 Next.js/Sharp의 로컬 이미지 최적화 요청: HTTP 200, PNG 응답 확인.
- 실제 DB 연동 E2E·Docker 이미지 빌드·원격 CI·배포는 아직 실행하지 않았다. 이 브랜치를 배포해야 운영 패치가 적용된다.

## 주요 근거

- [Next.js 16.3.3 보안 릴리스](https://github.com/vercel/next.js/releases/tag/v16.3.3)
- [Sharp 0.35.4 릴리스](https://github.com/lovell/sharp/releases/tag/v0.35.4)
- [Tiptap 3.30.5 릴리스](https://github.com/ueberdosis/tiptap/releases/tag/v3.30.5)
- [Vitest 4.1.11 릴리스](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11)
- [js-yaml 병합 처리 DoS 보안 공지](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)
