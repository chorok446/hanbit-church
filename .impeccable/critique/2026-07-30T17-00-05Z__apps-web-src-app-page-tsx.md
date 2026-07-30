---
target: 홈(/) — apps/web/src/app/page.tsx
total_score: 20
max_score: 28
na_heuristics: 5,7,10
p0_count: 0
p1_count: 2
timestamp: 2026-07-30T17-00-05Z
slug: apps-web-src-app-page-tsx
---
# 홈(/) 디자인 critique — 종합 리포트

Method: dual-agent (A: design-review · B: detector+browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 로딩·활성 표시는 좋으나 API 실패가 "소식이 없어요"로 위장(9번 연동) |
| 2 | Match System / Real World | 3 | 교회 언어는 탁월, 영문 eyebrow·"큐티" 약어가 초신자·고령층에 이물감 |
| 3 | User Control and Freedom | 3 | 모바일 전역 메뉴 부재로 이동의 자유가 홈 스크롤에 종속 |
| 4 | Consistency and Standards | 3 | 토큰·CTA 문법은 모범적, 자체 DESIGN.md 금지 규칙(eyebrow) 위반 + "검/색" pill 줄바꿈 |
| 5 | Error Prevention | n/a | 홈에 입력·파괴적 행위 없음(브랜드 표면) |
| 6 | Recognition Rather Than Recall | 3 | 핵심 정보 반복 제시는 우수, 모바일은 숨은 페이지 위치를 기억해야 함 |
| 7 | Flexibility and Efficiency | n/a | Persuade 표면 — 가속 장치 요구 과업 없음 |
| 8 | Aesthetic and Minimalist Design | 3 | 골드 절제·여백 상급, 9개 섹션·모바일 7,000px 스크롤 후반 밀도 피로 |
| 9 | Error Recovery | 2 | API 실패와 진짜 빈 콘텐츠가 동일 문구 — silent failure |
| 10 | Help and Documentation | n/a | 브랜드 표면 — /welcome 이 온보딩 역할 수행 |
| **Total** | | **20/28 (71%)** | **Good** |

n/a: 5, 7, 10 (Persuade/브랜드 표면 비적용).

## Design Specificity Verdict

**LLM 평가: "이 교회를 위해 지어진 화면" 70% / 템플릿 잔재 30%.** 저작된 것: 명조 성경구절 히어로(월별 말씀), 골드 한 줄 규율의 실집행, 소식 리스트의 "주보 목차" 감각, 다크 모드의 "저녁 예배당" 서사. 템플릿 잔재: 전 섹션 영문 uppercase eyebrow(자체 DESIGN.md 금지 위반), 아이콘 원+제목 4카드·3카드 범용 그리드, 콘서트풍 예배 스톡 사진(앤티레퍼런스 "대형교회 미디어 포털" 톤).

**결정론적 스캔**: 홈 관련 16개 파일 정적 스캔 클린(0건). 인페이지 디텍터 12건 — `kicker-above-heading` 3(Visit/Our Church/Community), `undersized-ui-text` 4(10px 영문 키커 "CHEOLMA JEIL CHURCH"·모바일 하단 탭 라벨 3종), `wide-tracking` 1(0.42em 영문 키커), `layout-transition` 1(height), `heading-rhythm` 3(키커+제목 그룹핑에 대한 오탐 판정). LLM이 놓친 것: height 트랜지션, 10px 하단 탭 라벨. 디텍터와 LLM이 합치한 것: eyebrow 문법.

**시각 오버레이**: 에이전트 격리 탭에서 주입·검증 후 정리됨(사용자 브라우저 탭에는 미표시).

## Overall Impression

뼈대는 이미 "종이 주보"를 산다 — 말씀-우선 히어로, 믿음의 사다리와 일치하는 섹션 순서, 규율 있는 토큰 집행. 그러나 데스크톱에서 완성된 경험이 모바일에서 무너진다(전역 내비 부재, 어절 분리 줄바꿈, 플로팅 위젯 겹침). 단일 최대 기회: **모바일 방문자 경험을 데스크톱 수준으로 끌어올리는 것**.

## What's Working

1. **말씀-우선 히어로** — 성경 한 구절을 명조로 세운 첫 화면은 이 사이트만의 서명. "말씀이 주인공"이 레이아웃 결정으로 구현됨.
2. **믿음의 사다리와 일치하는 내러티브** — 말씀→예배→일정→오시는길/새가족→정체성→소식→공동체 순서 + 퀵카드의 핵심 정보 선지급.
3. **토큰 규율의 실집행** — 골드 한 줄 규칙·포커스 링·CTA 공통 클래스가 실제로 지켜짐.

## Priority Issues

1. **[P1] 모바일 전역 내비게이션 부재** — 390px에서 주 메뉴 11개가 사라지고 햄버거/시트 트리거가 없음. 하단 탭(홈·교제·행사·마이)은 교인용 문법이라 1순위 사용자(방문자)의 교회소개·예배안내·새가족·설교가 상시 내비에서 실종. Fix: 시트 메뉴 복원(최소) + 비로그인 하단 탭의 방문자 우선 구성. → `/impeccable adapt` 또는 `shape`
2. **[P1] 한글 어절 분리 줄바꿈 전면 방치** — `word-break: keep-all`이 히어로 성구에만 적용. "새가족 안/내를"·"돕습니/다" 등 음절 꺾임 다수 실측. 조판 결함 = 브랜드 결함. Fix: body 레벨 keep-all + overflow-wrap 안전망. → `/impeccable typeset`
3. **[P2] 헤더 크롬 결함** — (a) "검색" pill "검/색" 세로 줄바꿈(전 데스크톱 폭), (b) 콜드 로드 FOUT 시 메뉴 글자 단위 세로 랩. 내비 링크 nowrap·lg 브레이크포인트는 /welcome polish에서 수정 완료, 검색 pill·폴백 메트릭 보정은 미해결. → `/impeccable polish`
4. **[P2] 전 섹션 영문 uppercase eyebrow** — 자체 DESIGN.md Don't 위반이자 고령 교인에게 6개 섹션 첫 단어가 전부 무의미. 디텍터·리뷰 합치 판정. 사이트 전역(20+ 파일) 공통 문법이라 일괄 패스 필요. → `/impeccable typeset` (사이트 전역)
5. **[P2] 플로팅 위젯 겹침 + JS 게이트 콘텐츠** — 테마 토글·위로가기가 푸터 링크·모바일 엄지 존을 가림(실측). `.reveal{opacity:0}`이 정적 콘텐츠를 JS에 종속(저속 회선 백지). Fix: 푸터 진입 시 위젯 승강, reveal 기본 표시+강화. → `/impeccable harden`

P3: API 실패와 빈 콘텐츠의 동일 문구(silent failure, 휴리스틱 9=2점의 원인), 이번 주 일정 시간순 미정렬, 푸터 이메일 hanbit@church.kr 리브랜드 잔재, 콘서트풍 예배 스톡 교체(TODO 인지됨), 10px 하단 탭 라벨·height 트랜지션(디텍터).

## Persona Red Flags

**Jordan(첫 방문자)**: "큐티" 약어 해독 불가, "이달의 말씀" 퀵카드의 3중 의미 충돌(말씀 라벨/성구 주소/설교 다시 보기→/sermons), 같은 목적지로 가는 중복 문.
**Casey(모바일·한 손·저속)**: 최다 실패 — 햄버거 부재, reveal 백지, 우측 엄지 존 위젯 겹침, 7,000px 스크롤 끝에야 보이는 사이트맵.
**고령 교인(프로젝트 페르소나)**: 영문 eyebrow·10px 라벨 해독 불가, 12–13px 보조 텍스트 부담, 아이콘 단독 컨트롤 기능 추측 불가. 긍정: 13:1 본문 대비·정보 반복.

## Minor Observations

비로그인에도 알림 벨이 프라임 자리 점유, 커뮤니티 카드 문구("댓글과 멘션")는 교인 어휘, Visit 좌우 높이 불균형, 새벽 기도회가 매일 반복이라 일정 5행 중 3행 점유, 골드 blur orb는 절제돼 합격.

## Questions to Consider

1. 주 메뉴 11개 자체가 "방문자 표면과 교인 도구가 한 크롬을 쓴다"는 신호 아닌가 — 비로그인 헤더 5개로 접는 이중 밀도는?
2. "종이 주보"가 왜 자기가 금지한 영문 eyebrow로 모든 섹션을 여는가 — 진짜 주보라면 "예배 안내", "이번 주"여야 하지 않나?
3. 헤더의 유일한 채움 버튼이 "회원가입"인데, 첫 방문자에게 시키고 싶은 최우선 행동은 계정 생성인가 "이번 주일에 오기"인가?

## 환경 노트

API(8080) 다운 상태에서 검사 — 오늘의 말씀 미렌더·소식 빈 상태는 아티팩트로 판정에서 제외. 콘솔 에러 전건 연결 거부(페이지 자체 JS 에러 0).
