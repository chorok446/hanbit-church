# 디자인 참고 프로젝트 의존성 보안 점검 — 2026-09-09

## 범위와 설치 기준

- 기준 커밋: `99df5e45` (`origin/develop`, PR #270 머지).
- 대상은 원본 다시다 Figma export인 `design-reference/`뿐이다. 운영 웹·API, 루트 pnpm 잠금 파일, 디자인 토큰은 변경하지 않았다.
- 루트 pnpm 워크스페이스(`apps/*`, `packages/*`) 밖에 있으며, 기존 README의 npm 명령과 유일한 잠금 파일인 `package-lock.json`을 설치 기준으로 삼았다. npm 11.19.0을 `packageManager`에 명시했다.
- 원본 템플릿의 `pnpm-workspace.yaml`과 npm에서 적용되지 않던 `pnpm.overrides.vite=6.3.5`를 제거했다. 실제 잠금 버전인 Vite 6.4.3은 유지했다.

## 발견 및 수정

변경 전 `npm audit --json`은 취약 패키지 3개(high 2, moderate 1), 고유 advisory 4개를 보고했다. 모두 참고 프로젝트의 개발 도구에 연결된 전이 의존성이다.

| 패키지 | 이전 → 수정 | Advisory |
| --- | --- | --- |
| browserslist | 4.28.4 → 4.28.9 | [캐시 무제한 증가](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [사용자 정의 통계 처리 오류](https://github.com/advisories/GHSA-73wf-gq98-2v4g) |
| baseline-browser-mapping | 2.10.38 → 2.11.21 | [잘못된 입력에 의한 프로세스 종료](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) |
| nanoid | 3.3.16 → 3.3.18 | [크기 0인 사용자 정의 생성기의 무한 루프](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |

실제 경로는 `@vitejs/plugin-react → @babel/core → @babel/helper-compilation-targets → browserslist → baseline-browser-mapping`, `vite → postcss → nanoid`다. 개발 도구의 존재만으로 운영 웹에서 악용 가능하다고 판단하지 않았으며, 별도 서비스의 입력 도달성이나 공격 재현은 검증하지 않았다.

`npm update browserslist baseline-browser-mapping nanoid --package-lock-only --ignore-scripts --no-fund`로 기존 semver 범위 안에서 갱신했다. Browserslist의 데이터 의존성 4개(`caniuse-lite`, `electron-to-chromium`, `node-releases`, `update-browserslist-db`)도 새 버전의 제약을 충족하도록 함께 갱신됐다. 강제 설치나 취약점 예외 처리는 사용하지 않았다.

첫 갱신은 기존 `react-router@8.3.0`의 peer 조건(`react >=19.2.7`)과 프로젝트의 React 18.3.1이 충돌해 `ERESOLVE`로 실패했다. 전체 소스·설정에서 Router 사용이 없고 `App.tsx`가 `useState`로 화면을 전환하는 것을 확인해 미사용 `react-router`와 종속 `cookie-es`를 제거했다. React·React DOM 18.3.1과 화면 코드는 유지했다.

## 설치 스크립트 정책

`design-reference/.npmrc`에 `ignore-scripts=true`를 적용해 의존성 설치 스크립트를 모두 차단했다. [npm 공식 설명](https://docs.npmjs.com/cli/v11/using-npm/config/#ignore-scripts)에 따라 명시적인 `npm run build` 등은 실행할 수 있으나 자동 pre/post 스크립트는 실행하지 않는다.

- `@tailwindcss/oxide@4.1.12`의 설치 스크립트는 플랫폼 패키지가 없으면 레지스트리에서 바이너리를 내려받는다.
- `esbuild@0.25.12`의 설치 스크립트에도 바이너리 검증·재설치·직접 다운로드 경로가 있다.
- `fsevents@2.3.3`의 암묵적 네이티브 빌드도 허용하지 않는다.
- 이번 macOS arm64 검증에서는 잠금 파일의 플랫폼별 사전 빌드 패키지만으로 빌드가 성공했다. 승인한 설치 스크립트는 없으며, 다른 환경에서 실패하면 차단을 일괄 해제하지 않고 누락된 플랫폼 패키지를 먼저 조사한다.

## 검증 결과

환경: macOS arm64, Node.js 26.7.0, npm 11.19.0. 기존 `design-reference/node_modules`가 없는 상태에서 검증했다.

```sh
cd design-reference
npm config get ignore-scripts  # true
npm ci --no-fund
npm audit --json
npm ls browserslist baseline-browser-mapping nanoid --all
npm ls react react-dom --depth=2
npm run build -- --outDir /private/tmp/hanbit-design-reference-security-20260909
```

- `npm ci`: 성공, 의존성 설치 스크립트 실행 없이 설치. peer 충돌 없음.
- `npm audit --json`: 모든 심각도 0건. 이 결과는 해당 시점의 알려진 advisory 기준이며 모든 취약점 부재를 보증하지 않는다.
- 의존성 트리: 수정된 3개 버전과 React 18.3.1 정렬 확인.
- Vite 프로덕션 빌드: 성공, 2,026개 모듈 변환. 생성물은 저장소 밖 임시 경로에 두었다.
- `git diff --check`: 성공.

설치 시 Recharts 2의 지원 종료 안내, Node 26 빌드 시 `module.register()` 사용 중단 예정 경고가 남는다. 이 작업에서는 관련 메이저 업그레이드나 참고 화면 재설계를 하지 않았다.

운영 웹·API 코드는 변경하지 않아 해당 전체 테스트와 브라우저 E2E는 재실행하지 않았다. Linux·Windows 설치 및 참고 화면 수동 조작도 미검증이다. 현재 루트 pnpm 보안 CI는 이 독립 npm 프로젝트를 검사하지 않으므로, 후속으로 참고 프로젝트용 설치·감사·빌드 게이트를 검토할 수 있다.
