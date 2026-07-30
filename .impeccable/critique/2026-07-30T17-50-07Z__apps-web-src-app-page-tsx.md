---
target: 홈(/) — apps/web/src/app/page.tsx (수정 배치 후)
total_score: 22.5
max_score: 28
na_heuristics: 5,7,10
p0_count: 1
p1_count: 2
timestamp: 2026-07-30T17-50-07Z
slug: apps-web-src-app-page-tsx
---
# 홈(/) 디자인 critique — 수정 배치 후 재실행

Method: dual-agent (A: design-review · B: detector+browser) · API·DB 정상 기동 상태에서 평가

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 활성 도트·aria-current·'오늘' 라벨 성실 |
| 2 | Match System / Real World | 4 | 교회 언어 그대로, SaaS 어휘 없음 |
| 3 | User Control and Freedom | 3 | 시트 ESC/외부클릭 닫힘 정상, 우하단 플로팅 2개 상시 점유 |
| 4 | Consistency and Standards | 2.5 | 한빛교회/hanbit@church.kr 브랜드 잔재(신뢰 훼손), 소식 카드만 이모지 배지 |
| 5 | Error Prevention | n/a | 입력·파괴 행위 없음 |
| 6 | Recognition Rather Than Recall | 3.5 | 퀵카드+하단 탭 재인 우수, 데스크톱 내비 11개는 부하 |
| 7 | Flexibility and Efficiency | n/a | Persuade 표면 |
| 8 | Aesthetic and Minimalist Design | 3.5 | 절제·위계 우수, 카드 문법 5연속 단조로움 |
| 9 | Error Recovery | 3 | API 실패 구분 처리 확인(직전 2→3) |
| 10 | Help and Documentation | n/a | /welcome 이 온보딩 수행 |
| **Total** | | **22.5/28 (80%)** | **Good** |

n/a: 5, 7, 10.

## 직전 대비 개선 확인 (양 평가 합치)

- 영문 uppercase eyebrow 제거 → 골드 헤어라인: 디텍터 `kicker-above-heading` 3→0, CLI 정적 스캔 0건 클린.
- 모바일 전역 내비: 시트 메뉴 정상 작동(ESC·외부클릭), 비로그인 하단 탭 방문자 우선(홈·예배안내·오시는길·새가족) — A가 강점으로 꼽음("이원화까지 정확").
- 한글 keep-all 조판, 검색 pill·헤더 줄바꿈 해소, 하단 탭 라벨 11px 승격(디텍터 undersized 3→0).
- silent failure 구분(휴리스틱 9: 2→3), reveal 기본 표시.
- 콘솔 에러 0건.

## Design Specificity

저작 70% / 템플릿 30% 유지. 저작: 말씀 인용 히어로, 골드 헤어라인, 실데이터(오늘 큐티·이번 주 실제 일정)가 설득 장치로 배선. 템플릿 잔재: 정체성 4카드(TODO 자리표시), 커뮤니티 3카드, 스톡 사진 2장. **결정적 디테일: 소식 작성자 "한빛교회"·푸터 "hanbit@church.kr"** — 시드/ENV 잔재가 신뢰 표면에 노출.

## Priority Issues

1. **[P0] 브랜드 잔재 노출** — 시드 작성자명 "한빛교회", 푸터 이메일 hanbit@church.kr. 로컬 시드·`NEXT_PUBLIC_CHURCH_EMAIL` env 미설정의 산물이지만 프로덕션에서도 env 누락 시 동일 노출. 배포 체크리스트로 env·시드 표시명 정리 필요.
2. **[P1] 데스크톱 내비 11개 평면 노출** — 방문자 첫 결정 지점 15개 선택지. 시트도 무그룹 11개. Fix: 방문자군/콘텐츠군/교인군 3그룹핑(시트 소제목 + 데스크톱 축약).
3. **[P1] 스톡 사진 인터루드** — 유일한 사진 섹션이 '컨퍼런스 워십' 무드의 남의 사진. 실사진 확보 전엔 텍스트 인용 대체가 컨셉에 충실.
4. **[P2] 소식 카드 이모지 배지(📢/📅)** — lucide+골드 문법 이탈. 텍스트 라벨/lucide로 통일.
5. **[P2] 큐티 카드 하단 대공백** — py-20 중첩으로 1440에서 1/3 화면 공백. 섹션 리듬 차등(py-14~20).

## Persona Red Flags

- Jordan: "한빛교회" 작성자명 혼란, 내비 절반이 내부자 어휘("큐티" 등), 홈에 사람 얼굴 전무.
- Casey: 헤더 5타깃 밀집(비로그인 알림 벨 무의미), 스톡 사진 전송량, 십수 스크린 길이.
- 고령 교인: 12.5px 메타 텍스트, 소형 골드 날짜 라벨, "큐티" 축약어(→"묵상" 제안).

## 도발적 질문

1. 사람이 한 명도 등장하지 않는 환대가 성립하는가 — 담임목사 두 줄 인사가 정체성 4카드보다 강하지 않은가?
2. 하단 탭은 방문자 3개로 접었는데 헤더만 11개를 고집하는 이유는?
3. 최고의 설득 장치인 "이번 주 교회 일정"이 세 번째 스크린에 있어야 하는가?

## 디텍터 상세 (B)

CLI 16파일 0건. 인페이지 7건 전부 오탐 판정: 브랜드 키커(10px/0.42em — 의도된 단일 킥커), CJK 줄길이 계측 한계(실제 ~40자/줄), 라벨-헤딩 그룹 미인식 3건, 소스 근거 없는 height transition 1건.
