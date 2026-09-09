# 디자인 참고 프로젝트

원본 다시다의 Figma export로, 한빛교회 운영 앱이나 디자인 기준이 아닙니다.
루트 pnpm 워크스페이스와 분리되어 있으며, 이 디렉터리의 `package-lock.json`을 사용하는 독립 **npm** 프로젝트입니다.

## 설치 및 확인

`package.json`에 지정된 npm 11.19.0을 사용합니다. 아래 명령은 모두 `design-reference/`에서 실행합니다.

```sh
npm ci
npm audit
npm run build
```

`.npmrc`의 `ignore-scripts=true`는 의존성의 설치 스크립트를 차단합니다. 플랫폼별 사전 빌드 패키지로 빌드하며, 명시적으로 호출한 `npm run build`와 `npm run dev`는 실행할 수 있습니다. 설치가 실패하더라도 스크립트 차단을 일괄 해제하지 말고 원인을 먼저 확인합니다.

참고 화면이 필요할 때만 `npm run dev -- --host 127.0.0.1`로 로컬 서버를 실행합니다. 운영 앱과 함께 실행하거나 배포하지 않습니다.

의존성 변경 시 `package-lock.json`을 함께 갱신하고 위 세 명령을 다시 검증합니다. 보안 점검 근거와 검증 범위는 [2026-09-09 점검 기록](../docs/security-design-reference-dependencies-2026-09-09.md)을 참고합니다.

CI의 `design-reference (npm)` 잡도 Node 22와 지정된 npm 버전으로 설치·전체 감사·빌드를 실행합니다. 어느 단계든 실패하면 자동 머지가 차단되며, 결과물은 배포하지 않습니다. npm 버전을 변경할 때는 `.github/workflows/ci.yml`의 고정 버전도 함께 갱신합니다.
