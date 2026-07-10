import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * 공개 주요 페이지 접근성 스모크 — axe-core 로 serious/critical 위반 0건을 강제한다.
 * (Lighthouse 수동 측정에서만 잡히던 a11y 회귀를 CI 에서 즉시 잡는다 — 푸터 대비·목록 구조 회귀 전례)
 * 실행: pnpm --filter web e2e a11y.spec.ts
 */
const PAGES = ["/", "/sermons", "/news", "/events", "/feed", "/login", "/signup", "/about", "/worship", "/welcome", "/giving", "/privacy", "/terms"];

for (const path of PAGES) {
  test(`a11y: ${path} 에 serious/critical 위반이 없다`, async ({ page }) => {
    await page.goto(path);
    // 목록 페이지는 클라이언트 fetch 가 끝나야 실제 콘텐츠가 검사된다.
    await page.waitForLoadState("networkidle");

    // 카카오맵 SDK 가 생성하는 DOM(<area> 등)은 우리가 제어할 수 없어 제외한다.
    const results = await new AxeBuilder({ page }).exclude('[data-third-party]').analyze();
    const severe = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");

    expect(
      severe.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)),
      })),
    ).toEqual([]);
  });
}
