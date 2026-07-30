---
target: 홈(/) — apps/web/src/app/page.tsx (3차, 2라운드 반영)
total_score: 20
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-07-30T18-19-51Z
slug: apps-web-src-app-page-tsx
---
# 홈(/) 디자인 critique — 3차 (2라운드 개선 반영)

Method: dual-agent (A: design-review · B: detector+browser) · API·DB 정상 상태

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "이번 주 일정"이 클라이언트 로딩 후 불쑥 등장(로딩 중 섹션 부재) |
| 2 | Match System / Real World | 4 | 교회 언어·한국어 표기·방문자 여정 순서 — 탁월 |
| 3 | User Control and Freedom | 3 | 전화번호가 tel: 링크가 아님(모바일 마지막 1미터 단절) |
| 4 | Consistency and Standards | 3 | 리브랜딩 잔재(한빛교회 작성자·hanbit 이메일)가 내부 일관성 훼손 |
| 5 | Error Prevention | n/a | 입력 폼 없음 |
| 6 | Recognition Rather Than Recall | 4 | 핵심 사실 반복 노출 — 기억 부담 0 |
| 7 | Flexibility and Efficiency | n/a | Persuade 표면 |
| 8 | Aesthetic and Minimalist Design | 3 | 첫 폴드 구절 참조 중복, /welcome 진입로 과잉 반복 |
| 9 | Error Recovery | n/a | 홈 오류 상태 없음(실패 시 섹션 숨김 폴백) |
| 10 | Help and Documentation | n/a | Persuade 표면 |
| **Total** | | **20/24 (83%)** | **Good** (Excellent 경계 90%) |

n/a: 5, 7, 9, 10 — 직전 회차와 채점 집합이 다름(9가 n/a로 이동).

## 추이 (백분율 기준)

20/28 (71%) → 22.5/28 (80%) → **20/24 (83%)**. 채점 집합이 달라 원점수는 비교 불가, 백분율로 상승 지속.

## 2라운드 개선의 검증 (양 평가 합치)

- Design specificity **70% → 85%** — "이번 주 일정의 구체성은 꾸며낼 수 없는 종류"(A).
- 하단 탭 방문자 우선 편집: "이 페이지에서 가장 영리한 결정"(A 강점 1위).
- 내비 그룹핑: "수는 많지만 그룹핑이 흡수한다", 시트는 "밀러 법칙 안쪽, 우수".
- 그리팅 인터루드: 페이지 끝 종결감 성립. 다크 모드 콘셉트 실성립.
- 디텍터: 정적 0건, 인페이지 7건 전부 기지 오탐/의도(신규 실결함 0) — 문서화된 단일 킥커 규칙·CJK 계측 한계 범주.
- DESIGN.md와 실물의 일치가 강점으로 언급됨("시스템이 실제로 지켜지고 있다").

## Priority Issues

1. **[P1] 리브랜딩 잔재** — 소식 작성자 "한빛교회"·푸터 hanbit@church.kr(로컬 시드·env 폴백). 회의적 방문자의 신뢰를 정면 타격. 배포 env(`NEXT_PUBLIC_CHURCH_EMAIL`)·시드 표시명 정리.
2. **[P1] 전화번호 tel: 링크 부재** — home-visit의 051-721-9322가 일반 텍스트. 모바일·고령 교인의 "전화 걸기" 단절. 한 줄 수정.
3. **[P2] 이달의 말씀 퀵카드 의미 불일치** — 히어로와 구절 중복 + 라벨(말씀)↔목적지(/sermons) 불일치. "최근 설교" 카드화 또는 묵상 연결로 재설계.
4. **[P2] 이번 주 일정 지연 등장** — ISR 시드가 있는데 찬양팀 병합 대기로 전체 클라이언트 렌더. 시드분 즉시 SSR + 찬양팀 도착 시 추가.
5. **[P3] 모바일 섹션 h2 고아 줄바꿈** — "…소중히 여기는 / 것". h2에 textWrap balance 적용.

## 페르소나

- Jordan: 경로 최단이나 전화 미링크·홈 내 지도 부재로 한 홉 더.
- Casey(회의적 검증자): 리브랜딩 잔재 발견 시 정성 인식 붕괴, 정체성 카드 범용 문안.
- 고령 교인: 12~12.5px 보조 텍스트 크기 부담, 전화 미링크가 가장 아픔.

## 생각해 볼 질문

1. 결심 이후의 종착 행동(지도앱·전화)이 홈에서 한 탭인가 — /welcome 진입로 4개보다 '종결 장치' 1개가 필요하지 않나.
2. 실사진 1장이 들어오는 순간을 위한 사진 아트디렉션 기준이 DESIGN.md에 미리 있어야 하지 않나.
3. 퀵카드 4장을 '사실 한 조각 + 다음 행동'으로 통일하면 첫 폴드 밀도가 한 단계 오르지 않나.

## 남은 정서 과제

단정함은 완성 단계, 따뜻함은 80% — 시각 증거(사람·공간) 부재가 마지막 갭. 실사진 확보가 코드 밖 최우선 과제.
