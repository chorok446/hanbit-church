---
name: 한빛교회 홈페이지
description: 종이 주보를 닮은 모던 클래식 — 크림 바탕, 딥네이비 잉크, 골드 한 줄
colors:
  navy-primary: "#1f2a44"
  cream-surface: "#faf8f3"
  body-ink: "#1a2235"
  gold-accent: "#c9a227"
  gold-deep: "#7c6110"
  card-white: "#ffffff"
  cream-muted: "#ece5d2"
  midnight: "#16203a"
  cream-on-navy: "#f6f3ea"
typography:
  display:
    fontFamily: "Noto Serif KR, serif"
    fontWeight: 600
  body:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "0.875rem–1rem"
    lineHeight: 1.6
rounded:
  md: "0.75rem"
  lg: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.navy-primary}"
    textColor: "{colors.cream-on-navy}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
---

# Design System: 한빛교회 홈페이지

## 1. Overview

**Creative North Star: "종이 주보(The Printed Bulletin)"**

잘 만든 종이 주보를 손에 쥔 느낌 — 크림색 종이 위에 명조로 찍힌 말씀, 단정한 네이비 잉크, 금박 한 줄. 이 시스템은 방문자를 환대하되 외치지 않는다. 색으로 경쟁하지 않고 여백·서체·한 줄의 골드로 위계를 만든다. 다크 모드는 같은 주보를 저녁 예배당 조명 아래에서 보는 미드나잇 네이비다.

이 시스템이 명시적으로 거부하는 것(PRODUCT.md 앤티레퍼런스): 플래시식 배너 슬라이더와 클립아트 종교 상징의 낡은 교회 홈페이지, 영상 자동재생과 팝업이 경쟁하는 대형교회 미디어 포털, 그라디언트 텍스트·글래스모피즘·네온의 차가운 SaaS 랜딩 문법.

**Key Characteristics:**
- 크림(#faf8f3) 바탕 + 딥네이비(#1f2a44) 잉크 + 골드(#c9a227) 한 줄 액센트
- 제목·성경구절은 명조(Noto Serif KR 600), 본문은 산세리프(Noto Sans KR)
- 색은 CSS 토큰으로만 — `dark ?` 삼항 금지, 라이트/다크는 `globals.css` 토큰이 전담
- 모션은 CSS + IntersectionObserver 공통 컴포넌트(ScrollReveal/StaggerItem) 재사용, reduced-motion 대안 필수

## 2. Colors

경쟁 교회 사이트의 하늘색·코발트 기업 블루, 또는 흰 바탕 미디어 포털과 갈라서는 조합 — 어두운 네이비를 주조로 세우고 따뜻한 크림이 받친다.

### Primary
- **딥네이비 (#1f2a44)**: 주조색. 제목·강조 잉크이자 라이트 모드 CTA 버튼 배경, 푸터·배너 밴드의 면. 신뢰와 경건함을 맡는 색 — 밝은 파랑 계열 "기업 블루"가 아니라 잉크에 가까운 어두운 네이비라는 점이 차별점이다. 다크 모드에서는 미드나잇(#16203a)이 바탕으로 내려앉는다.

### Secondary
- **골드 (#c9a227)**: 라벨·아이콘·구분선·포커스 링 같은 "한 줄"에만 쓰는 금박. 큰 면 사용은 금지(다크 모드 CTA 배경이 유일한 예외). 밝은 배경 위 작은 텍스트는 진한 골드(#7c6110)로 AA를 지킨다.

### Neutral
- **크림 (#faf8f3)**: 페이지 바탕. 종이 주보·성경책 면지의 따뜻한 환대 — 차가운 순백 대신 브랜드의 온기를 바탕이 직접 맡는다.
- **본문 잉크 (#1a2235)**: 본문 글자색. 크림 위 약 13:1 대비로 고령 교인까지 편안하게 읽힌다(AA·AAA 충족). 보조 텍스트는 rgba(31,42,68,0.7)까지만 흐려진다.
- **카드 화이트 (#ffffff)** / **크림 뮤트 (#ece5d2)**: 카드 면과 페이지 그라디언트의 끝 색.
- **크림 온 네이비 (#f6f3ea)**: 네이비 밴드 위 텍스트 — 테마와 무관하게 고정.

### Named Rules
**골드 한 줄 규칙.** 골드는 라벨·아이콘·구분선·포커스 링에만 허용된다. 골드로 면을 칠하는 순간 금박이 도금이 된다. (예외: 다크 모드 CTA 배경 단 하나.)
**토큰 단일 규칙.** 색은 `globals.css`의 CSS 토큰으로만 표현한다. 컴포넌트 안의 `dark ?` 색 삼항은 금지 — 이 마이그레이션은 완료됐고 되돌리지 않는다.

## 3. Typography

**Display Font:** Noto Serif KR (serif fallback) — weight 600 단일
**Body Font:** Noto Sans KR (Apple SD Gothic Neo, Malgun Gothic fallback)

**Character:** 명조 제목이 말씀의 무게를, 산세리프 본문이 일상의 가독성을 맡는 고전적 대비축(세리프+산스) 페어링. 한글 웹폰트 특성상 웨이트를 아껴 싣는다(명조는 600 하나만 — 웨이트당 서브셋 비용이 크다).

### Hierarchy
- **Display** (600, 명조): 히어로 제목·월별 말씀·성경 구절. `.font-display` 헬퍼로만 적용.
- **Headline/Title** (600–700, 산세리프 또는 명조): 섹션·카드 제목. 페이지 성격이 브랜드 면이면 명조, 도구 면이면 산세리프.
- **Body** (400, 0.875–1rem): 본문. 최대 행길이 65–75ch.
- **Label** (500, 0.75–0.8125rem): 태그·배지·보조 정보. 흐림은 --foreground-muted(0.7)까지만.

### Named Rules
**명조는 말씀에.** 명조는 제목과 성경 구절의 서체다. 버튼·입력·본문에 명조를 쓰면 장식이 된다.
**섹션 개시 규칙.** 공개 페이지의 섹션은 골드 헤어라인 한 줄(1px × 3rem, `--accent`)로 열고 명조 제목이 뒤따른다 — 영문 uppercase eyebrow를 걷어내고 채택한 문법이며, "골드 한 줄 규칙"의 대표 구현이다. 센터 정렬 섹션은 `mx-auto`, 섹션당 헤어라인은 하나만(제목 위 또는 아래 중 한 곳).
**단일 킥커 규칙.** 히어로의 "교회명 · 영문 교회명" 한 줄(10px·tracking 0.42em)은 사이트에서 유일하게 허용된 브랜드 킥커다. 다른 표면에 킥커·와이드 트래킹 라벨을 복제하지 않는다. 디텍터의 `undersized-ui-text`·`wide-tracking` 발화는 이 요소에 한해 의도된 오탐이다.

## 4. Elevation

기본은 평평하다 — 면의 구분은 색(카드 화이트 vs 크림 바탕)과 1px 보더(rgba 잉크 0.1)가 맡는다. 그림자는 상태의 응답으로만 등장한다: 클릭형 카드의 `.card-lift`(rest `0 12px 32px rgba(ink,0.08)` → hover `0 20px 44px rgba(ink,0.16)` + translateY)와 CTA hover(`0 10px 24px -14px rgba(0,0,0,0.35)`).

### Named Rules
**그림자는 어둡게 규칙.** hover 그림자는 테마와 무관하게 검정 기반 — 다크 모드에서 `--ink-rgb`(크림)를 그림자에 쓰면 글로우가 된다.

## 5. Components

### Buttons
- **Shape:** 부드러운 라운드 (0.75rem)
- **Primary (`.cta-solid`):** 라이트 = 네이비 바탕 + 크림 글자, 다크 = 골드 바탕 + 미드나잇 글자 (`--cta-bg`/`--cta-fg`)
- **Hover / Focus:** brightness 1.08 + 1px lift + 어두운 그림자; active 는 scale(0.98) 눌림 피드백; 포커스는 골드 outline 2px + offset 3px
- **Danger (`.cta-danger`):** 채워진 레드(#c73f2d) + 흰 글자, 동일한 lift 문법

### Cards / Containers
- **Corner Style:** 1rem
- **Background:** 카드 화이트(라이트) / rgba 화이트 0.055(다크), 1px 토큰 보더
- **Shadow Strategy:** 클릭형 카드만 `.card-lift` 공통 클래스 — 개별 hover 구현 금지
- **Internal Padding:** 1–1.5rem

### Inputs / Fields (`.ui-control`)
- **Style:** 1px 보더, 0.75rem 라운드, 0.75rem 1rem 패딩
- **Focus:** 골드 보더 + 3px 소프트 링
- **Disabled:** opacity 0.5 + not-allowed 커서

### Navigation
- **구조**: 내비는 `NAV_GROUPS` 3그룹(방문 안내 / 말씀과 소식 / 교제와 사역 — `src/lib/nav-items.ts`)이 단일 소스. 방문자 여정 순서가 곧 그룹 순서다.
- **데스크톱(lg+)**: 반투명 크림 고정 헤더(rgba(--surface-rgb, 0.85)) 안에 한 줄 내비(`whitespace-nowrap`) — 그룹 사이 가는 구분자(1px 보더), 활성 항목은 불투명도 1 + 골드 도트.
- **모바일(<lg)**: 헤더 햄버거 → 전체 메뉴 시트(body 포털 — 헤더 backdrop-filter가 fixed 자손을 가두므로 필수). 시트는 골드 그룹 소제목 + 항목 리스트 + 화면 모드 행. 하단 탭은 비로그인 = 방문자 우선(홈·예배안내·오시는길·새가족), 로그인 = 교인(홈·교제·행사·마이).
- **알림 벨은 로그인 사용자 전용** — 방문자 표면에 교인 도구를 노출하지 않는다.

### 사진 (Photography — 실사진 도입 전 기준)
현재 홈은 사진 0장(담임목사 인사 인용이 인터루드를 대신한다). 실사진이 들어오는 순간 페이지의 정서 무게중심이 바뀌므로, 도입 전 기준을 먼저 정한다:
- **자연광·일상 스케일** — 실제 예배당·로비·마당에서 찍은 자연광 사진. 사람이 있다면 소규모 공동체의 일상 순간(인사, 식사, 화단, 나눔).
- **금지**: 콘서트 조명·스포트라이트·올린 손의 '컨퍼런스 워십' 무드(앤티레퍼런스 "대형교회 미디어 포털" 톤), 스톡 사진의 임시 사용(가짜 얼굴은 신뢰를 깎는다 — 없는 편이 낫다).
- **처리**: 테두리 없는 라운드 프레임(1.5rem) + 골드 헤어라인 캡션, 크림 지면 위 과채도 보정 금지(종이 인쇄물 톤 유지).

### ScrollReveal / StaggerItem (Signature)
홈 섹션 등장 모션 공통 컴포넌트. CSS + IntersectionObserver 기반, 콘텐츠는 기본 표시 상태에서 강화만 한다. 새 모션은 반드시 이 패턴을 재사용한다.

## 6. Do's and Don'ts

### Do:
- **Do** 골드는 라벨·아이콘·구분선·포커스 링 등 "한 줄"에만 — 밝은 배경 위 소형 텍스트는 #7c6110.
- **Do** 색은 항상 `globals.css` 토큰으로 — 새 색이 필요하면 토큰을 추가하고 라이트/다크 짝을 함께 정의.
- **Do** 제목·성경구절은 `.font-display`(Noto Serif KR 600), 본문은 --font-body.
- **Do** 클릭형 카드 hover 는 `.card-lift`, CTA 는 `.cta-solid` 공통 클래스 재사용.
- **Do** 본문 대비 AA 이상 유지(크림 위 #1a2235), 보조 텍스트도 4.5:1 사수.
- **Do** 아이콘·배지는 lucide 라인 아이콘 + 골드/잉크 텍스트 라벨로 — 한 스트로크 패밀리를 유지한다.

### Don't:
- **Don't** 골드로 큰 면을 칠하지 마라 — 배너·카드·섹션 배경의 골드 채움은 절대 금지(다크 CTA 단 하나가 예외).
- **Don't** 그라디언트 텍스트·글래스모피즘 장식·네온 액센트 금지 — "차가운 SaaS 랜딩 문법"(PRODUCT.md 앤티레퍼런스)은 이 브랜드의 정반대다.
- **Don't** 클립아트식 종교 상징(비둘기·십자가 아이콘)·자동재생 배너 슬라이더 금지 — "낡은 관공서식 교회 홈페이지"와 "대형교회 미디어 포털"로 끌려간다.
- **Don't** 컴포넌트에 `dark ?` 색 삼항을 재도입하지 마라. `useTheme` 도 색 용도로는 금지.
- **Don't** side-stripe 보더(2px+ border-left 액센트), hero-metric 템플릿, 섹션마다 붙는 uppercase eyebrow 금지 — eyebrow 자리는 섹션 개시 규칙(골드 헤어라인)이 대체했고, 유일한 예외는 히어로의 단일 브랜드 킥커다.
- **Don't** 이모지를 아이콘·배지 대용으로 쓰지 마라 — 컬러 이모지는 "종이 주보" 인쇄 톤을 깬다.
