// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../../../pnpm-workspace.yaml", import.meta.url), "utf8");
const gradleWrapper = readFileSync(new URL("../../../api/gradle/wrapper/gradle-wrapper.properties", import.meta.url), "utf8");
const referenceManifest = JSON.parse(readFileSync(new URL("../../../../design-reference/package.json", import.meta.url), "utf8"));
const referenceNpmrc = readFileSync(new URL("../../../../design-reference/.npmrc", import.meta.url), "utf8");
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

  it("Gradle 배포 파일은 SHA-256 체크섬을 검증한다", () => {
    expect(gradleWrapper).toMatch(/^distributionSha256Sum=[a-f0-9]{64}$/m);
    expect(gradleWrapper).toMatch(/^validateDistributionUrl=true$/m);
  });

  it("참고 프로젝트는 별도 npm 설치 경계와 고정 도구 버전을 사용한다", () => {
    const reference = job("design-reference");
    expect(reference).toMatch(/^\s+working-directory: design-reference$/m);
    expect(reference).toMatch(/^\s+cache: npm$/m);
    expect(reference).toMatch(/^\s+cache-dependency-path: design-reference\/package-lock.json$/m);
    expect(reference).toContain(`npm install --global ${referenceManifest.packageManager} --ignore-scripts`);
    expect(reference).not.toContain("pnpm install");
  });

  it("참고 프로젝트도 스크립트를 차단한 고정 설치 후 빌드한다", () => {
    const reference = job("design-reference");
    expect(referenceNpmrc).toMatch(/^ignore-scripts=true$/m);
    expect(reference).toMatch(/^\s+run: npm ci --ignore-scripts$/m);
    expect(reference).toMatch(/^\s+run: npm run build$/m);
  });

  it("참고 프로젝트는 개발 의존성을 포함한 전체 감사를 건너뛰거나 무시하지 않는다", () => {
    const reference = job("design-reference");
    expect(reference.split("    steps:")[0]).not.toMatch(/^\s+if:/m);
    expect(reference).toMatch(/^\s+run: npm audit$/m);
    expect(reference).not.toMatch(/^\s+continue-on-error:/m);
  });

  it("자동 머지는 참고 프로젝트 검사 성공도 기다린다", () => {
    expect(job("automerge")).toMatch(/^\s+needs: \[[^\]\n]*\bdesign-reference\b[^\]\n]*\]$/m);
  });
});
