// Dockerfile.prod 전용 사전 검사. 로컬 dev/일반 CI 빌드는 공개 설정 없이도 계속 동작한다.
// 값 자체는 출력하지 않는다. 잘못 붙여 넣은 자격 증명도 빌드 로그에 남기지 않는다.
const mode = process.env.WEB_BUILD_MODE ?? "production";
const issues = [];
const fail = (key, reason) => issues.push(`${key}: ${reason}`);

if (!["production", "verification"].includes(mode)) {
  fail("WEB_BUILD_MODE", "production 또는 verification이어야 합니다.");
}

const required = [
  "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_CHURCH_NAME",
  "NEXT_PUBLIC_CHURCH_ADDRESS", "NEXT_PUBLIC_CHURCH_PHONE",
];
for (const key of required) {
  if (!process.env[key]?.trim()) fail(key, "운영 이미지에 필요한 공개 설정입니다.");
}
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && value && (value !== value.trim() || /[\r\n\0]/.test(value))) {
    fail(key, "앞뒤 공백이나 줄바꿈 없이 한 줄로 지정하세요.");
  }
}

for (const key of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SITE_URL"]) {
  const value = process.env[key];
  if (!value?.trim()) continue;
  try {
    const url = new URL(value);
    // 두 소비처 모두 루트에 /api 또는 페이지 경로를 붙인다. 경로·쿼리·끝 슬래시는 허용하지 않는다.
    if (url.protocol !== "https:" || value !== url.origin) {
      fail(key, "자격 증명·경로·쿼리·끝 슬래시 없는 HTTPS origin을 지정하세요.");
      continue;
    }
    const host = url.hostname;
    const placeholder = /(^|\.)(localhost|local|invalid|test|example)$/.test(host)
      || /(^|\.)example\.(com|net|org)$/.test(host)
      || /^(127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
      || ["[::1]", "[::]"].includes(host);
    if (mode !== "verification" && placeholder) {
      fail(key, "운영 공개 주소에 로컬·사설·자리표시 호스트를 사용할 수 없습니다.");
    }
  } catch {
    fail(key, "올바른 HTTPS origin이 아닙니다.");
  }
}

const phone = process.env.NEXT_PUBLIC_CHURCH_PHONE;
if (phone?.trim()) {
  const digits = phone.replace(/[+()\s-]/g, "");
  if (!/^\d{9,15}$/.test(digits)) fail("NEXT_PUBLIC_CHURCH_PHONE", "실제 연락 가능한 전화번호를 지정하세요.");
  if (mode !== "verification" && (digits === "0510000000" || /^0+$/.test(digits))) {
    fail("NEXT_PUBLIC_CHURCH_PHONE", "자리표시 전화번호를 운영에 사용할 수 없습니다.");
  }
}
if (mode !== "verification" && process.env.NEXT_PUBLIC_CHURCH_ADDRESS === "서울특별시 한빛구 한빛로 1") {
  fail("NEXT_PUBLIC_CHURCH_ADDRESS", "자리표시 주소를 운영에 사용할 수 없습니다.");
}

if (issues.length) {
  console.error(`웹 이미지 공개 설정 검증 실패:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`웹 이미지 공개 설정 검증 통과 (${mode}).`);
}
