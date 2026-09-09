// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/validate-build-config.mjs", import.meta.url));
const valid = {
  NEXT_PUBLIC_API_URL: "https://api.hanbit-church.kr",
  NEXT_PUBLIC_SITE_URL: "https://hanbit-church.kr",
  NEXT_PUBLIC_CHURCH_NAME: "설정 검증 교회",
  NEXT_PUBLIC_CHURCH_ADDRESS: "부산광역시 기장군 교회로 12",
  NEXT_PUBLIC_CHURCH_PHONE: "051-123-4567",
};

function validate(env: Record<string, string>) {
  // 실제 로컬 공개 설정/비밀값을 상속하지 않고 fixture만 전달한다. 외부 요청은 없다.
  return spawnSync(process.execPath, [script], { encoding: "utf8", env: { NODE_ENV: "test", ...env } });
}

describe("운영 웹 빌드 설정", () => {
  it("필수 공개 설정이 유효하면 선택 설정 없이 통과한다", () => {
    expect(validate(valid).status).toBe(0);
  });

  it.each(Object.keys(valid))("필수 %s가 비면 중단한다", (key) => {
    const result = validate({ ...valid, [key]: "" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(key);
  });

  it.each([
    "http://api.hanbit-church.kr", "https://localhost", "https://127.0.0.1:8080",
    "https://[::1]", "https://ci-build-placeholder.invalid", "https://api.example.com",
    "https://api.church.test", "https://api.hanbit-church.kr/api", "not-a-url",
  ])("운영 API URL %s를 거부한다", (url) => {
    const result = validate({ ...valid, NEXT_PUBLIC_API_URL: url });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_API_URL");
  });

  it("사이트 URL에도 운영 URL 검증을 적용한다", () => {
    const result = validate({ ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_SITE_URL");
  });

  it.each([
    ["NEXT_PUBLIC_CHURCH_ADDRESS", "서울특별시 한빛구 한빛로 1"],
    ["NEXT_PUBLIC_CHURCH_PHONE", "051-000-0000"],
    ["NEXT_PUBLIC_CHURCH_PHONE", "전화 문의"],
    ["NEXT_PUBLIC_CHURCH_NAME", "   "],
    ["NEXT_PUBLIC_CHURCH_PASTOR", "첫 줄\n다음 줄"],
  ])("%s의 자리표시/잘못된 값은 거부한다", (key, value) => {
    const result = validate({ ...valid, [key]: value });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(key);
  });

  it("오류에 실제 설정값이나 URL 자격 증명을 노출하지 않는다", () => {
    const result = validate({ ...valid, NEXT_PUBLIC_API_URL: "https://user:never-log-this@api.hanbit-church.kr" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_API_URL");
    expect(result.stderr).not.toContain("never-log-this");
  });

  it("명시적인 verification 모드에서만 검증용 자리표시 값을 허용한다", () => {
    const fixture = {
      ...valid, NEXT_PUBLIC_API_URL: "https://ci-build-placeholder.invalid",
      NEXT_PUBLIC_SITE_URL: "https://ci-site-placeholder.invalid",
      NEXT_PUBLIC_CHURCH_ADDRESS: "서울특별시 한빛구 한빛로 1",
      NEXT_PUBLIC_CHURCH_PHONE: "051-000-0000",
    };
    expect(validate({ ...fixture, WEB_BUILD_MODE: "verification" }).status).toBe(0);
    expect(validate({ ...fixture, WEB_BUILD_MODE: "production" }).status).toBe(1);
    expect(validate(fixture).status).toBe(1);
  });

  it("알 수 없는 모드로 검증을 우회하지 못한다", () => {
    const result = validate({ ...valid, WEB_BUILD_MODE: "prodution" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WEB_BUILD_MODE");
  });
});

describe("공개 설정의 빌드 전달 경로", () => {
  const docker = readFileSync(new URL("../../Dockerfile.prod", import.meta.url), "utf8");
  const cd = readFileSync(new URL("../../../../.github/workflows/cd.yml", import.meta.url), "utf8");
  const verificationWorkflows = ["image-verify.yml", "image-verify-develop.yml"].map((file) => [
    file,
    readFileSync(new URL(`../../../../.github/workflows/${file}`, import.meta.url), "utf8"),
  ] as const);
  const example = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
  const source = new URL("../", import.meta.url);
  const usedKeys = new Set(
    readdirSync(source, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test.") && !file.endsWith(".d.ts"))
      .flatMap((file) => [...readFileSync(new URL(file, source), "utf8").matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z_]+)/g)])
      .map((match) => match[1]),
  );

  it.each([...usedKeys])("%s를 Docker ARG/ENV와 CD 변수에 모두 연결한다", (key) => {
    expect(example).toContain(`${key}=`);
    expect(docker).toContain(`ARG ${key}\n`);
    expect(docker).toContain(`${key}=$${key}`);
    expect(cd).toContain(`${key}=\${{ vars.${key} }}`);
  });

  it("Docker는 운영 모드가 기본이며 Next 빌드 전에 검증한다", () => {
    expect(docker).toContain("ARG WEB_BUILD_MODE=production");
    const validation = docker.indexOf("node apps/web/scripts/validate-build-config.mjs");
    expect(validation).toBeGreaterThan(-1);
    expect(validation).toBeLessThan(docker.indexOf("RUN pnpm --filter web build"));
  });

  it("CD는 운영 모드 고정이고 자리표시 대체 값을 사용하지 않는다", () => {
    expect(cd).toContain("WEB_BUILD_MODE=production");
    expect(cd).not.toContain("ci-build-placeholder");
    expect(cd).not.toContain("WEB_BUILD_MODE=verification");
  });

  it.each(verificationWorkflows)("%s는 공개 fixture만 쓰고 이미지를 푸시하지 않는다", (_file, verify) => {
    expect(verify).toContain("WEB_BUILD_MODE=verification");
    expect(verify).toContain("push: false");
    expect(verify).not.toContain("vars.NEXT_PUBLIC_");
  });

  it.each(verificationWorkflows)("%s의 실제 build args가 설정 검증을 통과한다", (_file, verify) => {
    const args = Object.fromEntries(
      [...verify.matchAll(/^\s+(WEB_BUILD_MODE|NEXT_PUBLIC_[A-Z_]+)=(.+)$/gm)]
        .map((match) => [match[1], match[2].trim()]),
    );
    const result = validate(args);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("develop 검증은 사전 검사 스크립트와 공개 설정 계약 변경에도 실행한다", () => {
    const develop = verificationWorkflows.find(([file]) => file === "image-verify-develop.yml")![1];
    expect(develop).toContain('"apps/web/scripts/validate-build-config.mjs"');
    expect(develop).toContain('"apps/web/.env.example"');
  });
});
