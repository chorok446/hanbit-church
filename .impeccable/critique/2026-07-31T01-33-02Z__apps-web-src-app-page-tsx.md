---
target: 홈(/) — apps/web/src/app/page.tsx (5차, 4차 수정 라운드 반영)
total_score: 29
p0_count: 0
p1_count: 1
timestamp: 2026-07-31T01-33-02Z
slug: apps-web-src-app-page-tsx
---
# 홈(/) 디자인 critique — 5차 (4차 P1·P2 수정 라운드 반영)

Method: dual-agent (A: design-review · B: detector+browser/Playwright) · API·DB 정상 기동 · PR #251 반영 상태

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 주간 일정이 클라이언트 로드 후 '출현' — 아래 섹션이 밀림 |
| 2 | Match System / Real World | 4 | 도메인 언어 완전, 섹션 순서 = 방문자 실제 결정 순서(무엇→언제→어디→누가) |
| 3 | User Control and Freedom | 3 | 시트 ESC·오버레이·포커스 복귀·스크롤 잠금 정석 |
| 4 | Consistency and Standards | 3 | 섹션 보조 링크 3종 혼재(muted 밑줄/골드 화살표/골드 밑줄) |
| 5 | Error Prevention | n/a | 입력·파괴 행위 없음 |
| 6 | Recognition Rather Than Recall | 3 | 라벨=목적지 일치·푸터 재요약. 11항목 평면 내비는 구분자 의존 |
| 7 | Flexibility and Efficiency | 3 | skip link·방문자 하단 탭·푸터 바로가기 — 충분하나 그 이상은 아님 |
| 8 | Aesthetic and Minimalist Design | 4 | 절제가 실제 화면에서 읽힘 — 사진 0장인데 빈약해 보이지 않는 드문 사례 |
| 9 | Error Recovery | 3 | 소식 실패 구분 모범. 일정·묵상은 실패 시 무음 소멸(일정 없는 교회로 오독 여지) |
| 10 | Help and Documentation | 3 | "처음 오셨나요?" 동선이 온보딩 헬프 역할 |
| **Total** | | **29/36 (81%)** | **Good** (첫 4점 2개 등장) |

n/a: 5. 추이(백분율): 71% → 80% → 83% → 75% → **81%**. 4차 대비 채점 집합이 또 달라(10번 재편입) 원점수 비교는 주의 — 질적 신호는 **첫 4점 2개(실세계 일치·미학)** 와 "단일 킥커 규칙 준수 확인"(4차 P2 소멸).

## Anti-Patterns Verdict

**LLM: slop 아님(통과)** — 6개 패턴 전부 클린, 단일 킥커 규칙 준수 확인. 잔여물 1건: 히어로 골드 블러 오브(SaaS glow orb 흔적, P3).
**디텍터: 신규 실결함 0** — CLI 2건·인페이지 wide-tracking/layout-transition 전부 기지 오탐 재현, line-length(데스크톱 한정, 묵상 단락 ~95자/행)만 잔존(CJK 계측 한계 유보, max-w 좁힘 검토 여지). 콘솔 error/warning 0.
**오버레이**: 독립 브라우저 스캔이라 사용자 열람용 오버레이 탭 없음.

## 4차 → 5차 개선 확인

- h1 부재(P1) 해소 — 디텍터·A 모두 재지적 없음
- 시드 작성자 잔재(P1) 해소 — 소식 작성자 교회명 일치
- 미세 킥커(P2) 해소 — "킥커는 히어로 1곳뿐, 단일 킥커 규칙 준수 확인"(A)
- 정체성 자리표시(P2) 해소 — 감정 여정에서 해당 골짜기 소멸, 인사 인터루드가 Peak 2 로 안착

## Priority Issues

1. **[P1] 소식 행이 '빈 교회' 신호 발신** — 제목이 본문 문장 발췌라 스캔 불가 + "댓글 0" 카운트 노출(공식 채널인데 0 만 남음). Fix: home-devotion 패턴대로 `comments > 0` 일 때만 카운트 렌더, 발췌 제목 어미 앞 절단 검토. Suggested: /impeccable polish
2. **[P2] 주간 일정 pop-in** — 시드가 있어도 첫 페인트에 섹션 부재 → 통째 삽입되며 아래 4개 섹션 밀림. Fix: useState 초기값에서 시드로 즉시 계산(SSR 포함), 찬양팀만 병합 — 단 직전 코드리뷰의 '가시 행 교체' 결함이 재발하지 않는 병합 규칙 필요. Suggested: /impeccable optimize
3. **[P2] 행사 행의 시간·장소 공백** — 시간 없는 행사와 기도회 행의 정보 밀도 불균형. Fix: '종일' 배지 또는 모집기간 폴백. Suggested: /impeccable clarify
4. **[P3] 모바일 히어로 킥커 줄바꿈** — 390px 에서 영문 병기가 어색한 2줄. Fix: <sm 영문 숨김 또는 의도적 2단 조판.
5. **[P3] 히어로 골드 블러 오브 제거** — opacity 15% glow orb, 종이 주보 은유 무기여.

## Persona Red Flags

- **Jordan**: "중보"·"은혜나눔" 내부어 잔존, 교단·규모·공간 사진 단서 0.
- **Casey**: 총 ~6,200px 스크롤에서 소식·커뮤니티 도달률 낮음, 일정 pop-in 탭 오조준 위험(하단 탭이 구제).
- **고령 교인**: 대비·타깃·tel 합격. 12~12.5px 보조 텍스트 다수(크기가 병목), 다크모드 토글이 시트 안에만.

## Minor Observations

- 섹션 보조 링크 스타일 3종 혼재 → 1종 통일 후보.
- 오시는길 링크 `/about` vs 하단 탭 `/about#location` 앵커 비일관.
- 퀵카드 '오시는 길'만 2줄이라 4카드 높이 리듬 깨짐(주소 축약 검토).
- 소식 첫 행 3% 하이라이트 의미 불명.
- 푸터 저작권 영문뿐 — 한국어 병기 자연스러움.

## Questions to Consider

1. 설교는 어디 있는가 — 믿음의 사다리 2단인데 홈 존재감이 내비 링크 1개뿐.
2. "처음 오셨나요?"를 세 번 묻는 건 환대인가 영업인가.
3. 사진 0장은 언제까지 미덕인가 — '얼굴 없는 차가움'의 임계점을 교회와 합의했는가.

**한 줄 총평(A)**: AI slop 이 아니라 편집된 디자인 — 남은 과제는 시각이 아니라 콘텐츠 설득력(소식 빈약 신호·설교 부재·일정 정보 공백).
