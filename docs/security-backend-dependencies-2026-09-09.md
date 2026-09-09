# 백엔드 의존성 보안 패치 — 2026-09-09

기준: PR #268 머지 후 `origin/develop`의 `af48044e`.
범위: Gradle이 해석한 `runtimeClasspath` 161개, `testRuntimeClasspath` 199개 Maven 컴포넌트(중복 제거 199개, BOM 등 메타데이터 포함).
빌드 플러그인·JDK·OS·컨테이너 전체 취약점 검사는 이 결과에 포함하지 않는다.

## 감사 결과와 변경

공개 패키지 좌표와 버전만 [OSV querybatch API](https://google.github.io/osv.dev/post-v1-querybatch/)에 조회했다.
응답 개수와 페이지 누락 여부를 검사하고 발견된 공지의 상세 내용·벤더 패치 내역을 대조했다.
**7개 컴포넌트에 해당하는 고유 공지 11건 → 0건**이다. Jackson 2·3이 공유하는 공지는 중복 집계하지 않았다.
OSV 분류는 critical 4 / moderate 7이며, 이 분류가 현재 앱에서의 악용 가능성을 뜻하지는 않는다. 특히 Tomcat 벤더의 영향도 분류는 OSV와 다르다.

| 구성 요소 | 이전 | 패치 후 | 관리 방식 |
| --- | --- | --- | --- |
| Spring Boot | 4.1.0 | 4.1.1 | 동일 릴리스 계열 패치 |
| Spring Security / Data JPA | 7.1.0 / 4.1.0 | 7.1.1 / 4.1.1 | Boot BOM |
| Tomcat core·el·websocket | 11.0.22 | 11.0.25 | `tomcat.version`으로 함께 정렬 |
| Jackson 2 / 3 databind | 2.21.4 / 3.1.4 | 2.21.5 / 3.1.5 | Boot BOM |
| Netty | 4.2.15.Final | 4.2.17.Final | Boot BOM |
| Log4j API | 2.25.4 | 2.25.5 | Boot BOM |
| jsoup | 1.22.2 | 1.23.1 | 직접 의존성 |

Boot 4.1.1이 관리하는 Tomcat 11.0.24에도 보안 공지가 남으므로 Tomcat만 별도로 고정했다.
상위 Boot BOM이 11.0.25 이상을 관리하면 override를 제거하고 실제 해석 버전·재감사·전체 테스트·JAR 패키징을 확인한다.
Kotlin 2.4.10, JDK 21, Gradle 9.6.1은 유지했다. 인증·CORS·권한·속도 제한·DB 스키마·배포 변수는 변경하지 않았다.

## 도달 경로와 영향 판단

- 외부 요청 → Tomcat → Spring Security에 등록한 앱의 JWT 필터 → 컨트롤러·DB가 주요 경계다. 보호 대상은 교인 정보, 세션, 비공개 게시글과 관리자 권한이다.
- Tomcat: DIGEST·FORM 및 Servlet 선언형 인증 제약 관련 공지가 일치했다. 현재 앱은 stateless JWT와 Spring 필터 권한 검사를 사용하며 해당 Tomcat 인증 설정은 찾지 못했다. 그럼에도 요청을 직접 처리하는 서버이므로 11.0.25로 갱신했다. 벤더가 함께 공지한 HTTP/2·WebSocket 수정도 이 패치에 포함된다.
- Netty: Redis 클라이언트의 전이 의존성이다. DNS 디코더는 연결 경로에 포함될 수 있다. 서버 TLS를 종료하는 `SniHandler` 사용은 앱 코드에서 찾지 못했으므로 SNI/mTLS 우회가 현재 사이트에서 재현된 것으로 주장하지 않는다.
- Jackson: JSON 요청 처리·JWT 등에 실제 사용된다. 공지의 전제인 `JsonView`·`JsonUnwrapped`·외부 타입 ID·대소문자 무시 속성 조합은 앱 코드에서 찾지 못했다.
- jsoup: 저장 전 `sanitizeRichBodyHtml`에서 사용한다. 커스텀 허용 목록은 일반 서식 태그만 허용하고 raw-text 요소는 허용하지 않으므로 이번 공지의 전제에는 해당하지 않는다. 허용 목록을 넓히지 않고 패치했다.
- Log4j: SLF4J/Logback 연결용 전이 의존성이다. 취약 경로인 `MapMessage` JSON 출력의 직접 사용은 찾지 못했다.
- 별도로 Spring 공식 공지도 확인했다. DPoP·WebAuthn·OAuth2 Authorization Server는 앱에서 사용하지 않는다. Data JPA의 native-query 정렬 우회는 비신뢰 Sort 입력이 전제인데, 유일한 native query인 DAU 집계에는 Sort/Pageable 인자가 없다. 관련 버전은 Boot BOM과 함께 갱신했다.

OSV에서 일치한 고유 공지:

- Jackson: `GHSA-5gvw-p9qm-jgwh`, `GHSA-5jmj-h7xm-6q6v`, `GHSA-mhm7-754m-9p8w`
- Netty: `GHSA-mfg7-5gfp-c4w3`, `GHSA-c4c3-7fpv-j4q5`, `GHSA-fccg-mwvh-qqg4`
- Tomcat: `GHSA-9xv2-5v5q-p794`, `GHSA-gcx9-497g-6cp6`, `GHSA-h3x4-894j-xpx5`
- Log4j: `GHSA-qv9r-c865-cp47`
- jsoup: `GHSA-pmhh-3w7g-xqp8`

## 빌드 공급망 검증

Gradle 공식 [배포 체크섬](https://services.gradle.org/distributions/gradle-9.6.1-bin.zip.sha256)을 `distributionSha256Sum`에 고정했다.
공식 [Wrapper 체크섬](https://services.gradle.org/distributions/gradle-9.6.1-wrapper.jar.sha256)과 저장소 JAR의 SHA-256도 일치한다.
기존 캐시를 삭제하지 않고 빈 임시 `GRADLE_USER_HOME`에서 `./gradlew --version`을 실행해 새 다운로드의 검증을 확인했다.
이는 Gradle 배포 파일의 무결성 검증이며 모든 라이브러리의 신뢰성·무취약성을 보증하는 것은 아니다.
Gradle 버전을 올릴 때 URL과 공식 배포 체크섬을 함께 갱신해야 한다. `security-pipeline.test.ts`가 체크섬 누락을 막는다.

## 검증 결과

- 백엔드 `./gradlew build --no-daemon`: 성공. 118개 테스트 클래스, 978개 중 977개 통과, 실패·오류 0, 기존 조건부 Redis 연결 테스트 1개 미실행(`REDIS_SMOKE=true` 필요).
- 생성된 실행 JAR의 `BOOT-INF/lib`에서 위 패치 버전을 확인했다. Tomcat 세 모듈도 모두 11.0.25다.
- 웹 전체 테스트: 55파일 / 366개 통과. 체크섬 테스트는 수정 전 실패·수정 후 통과를 확인했다.
- 웹 타입 검사 통과. ESLint 오류 0 / 기존 화면 이동 경고 1. Kotlin 컴파일의 기존 `GeoIpService` annotation-target 경고는 남겼다.
- 패치 후 같은 199개 좌표를 OSV로 재조회: 공지 일치 0건. `pnpm audit --audit-level=low`도 알려진 취약점 없음.
- Docker 엔진이 실행 중이 아니어서 컨테이너 이미지 빌드·OS 스캔과 실제 DB E2E는 실행하지 못했다. 원격 CI와 배포는 아직 하지 않았다.

## 남은 작업

- `design-reference/package-lock.json`에 Dependabot 알림 2건이 남는다: browserslist(high, 4.28.7부터 수정), baseline-browser-mapping(medium, 2.11.0부터 수정). 운영 앱 워크스페이스 밖의 참고 프로젝트이므로 별도 패치 대상으로 둔다.
- Docker가 가능한 환경에서 운영 이미지의 JDK·OS 패키지를 검사한다. 태그만으로 현재 배포 이미지의 내용을 추정하지 않는다.
- 현재 CI의 native audit 게이트는 pnpm 범위다. 이번 OSV 조회는 일회성 점검이며 JVM 취약점의 지속 검사 게이트를 추가한 것은 아니다.

## 주요 공식 근거

- [Spring Boot 4.1.1 릴리스와 관리 의존성 변경](https://github.com/spring-projects/spring-boot/releases/tag/v4.1.1)
- [Apache Tomcat 11 보안 공지](https://tomcat.apache.org/security-11.html)
- [jsoup 1.23.1 릴리스](https://jsoup.org/news/release-1.23.1)
- [Spring Data JPA 정렬 검증 공지](https://spring.io/security/cve-2026-47834/)
- [Gradle Wrapper 체크섬 검증 문서](https://docs.gradle.org/current/userguide/gradle_wrapper.html#sec:verification)
