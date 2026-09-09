// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../../../pnpm-workspace.yaml", import.meta.url), "utf8");
const job = (name: string) => ci.split(`\n  ${name}:\n`)[1]?.split(/\n  [\w-]+:\n/)[0] ?? "";

describe("의존성 보안 게이트", () => {
  it("high 이상 감사 실패를 무시하지 않는다", () => {
    const security = job("security");
    expect(security).toMatch(/^\s+run: pnpm audit --audit-level=high$/m);
    expect(security).not.toMatch(/^\s+continue-on-error:\s*true\s*$/m);
  });

  it("자동 머지는 보안 잡 성공도 기다린다", () => {
    expect(job("automerge")).toMatch(/^\s+needs: \[[^\]\n]*\bsecurity\b[^\]\n]*\]$/m);
  });

  it("고정 lockfile과 미검토 설치 스크립트 차단을 유지한다", () => {
    expect(job("security")).toContain("pnpm install --frozen-lockfile");
    expect(workspace).toMatch(/^strictDepBuilds: true$/m);
    expect(workspace).not.toMatch(/^dangerouslyAllowAllBuilds: true$/m);
  });
});
