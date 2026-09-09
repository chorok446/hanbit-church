const INTERNAL_ORIGIN = "https://internal.invalid";

/** 신뢰할 수 없는 이동 주소는 루트 상대 경로만 허용한다. 검증한 원문을 그대로 사용한다. */
export function isInternalHref(href: string | null | undefined): href is string {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href !== href.trim() || href.includes("\\")) {
    return false;
  }
  // URL 파서가 무시하는 탭·개행 등과 제어문자를 제거하지 않고 거부한다.
  for (const char of href) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  try {
    const url = new URL(href, INTERNAL_ORIGIN);
    // 점 세그먼트 정규화 뒤 // 로 시작하는 경로도 상대 주소로 재해석되지 않게 막는다.
    return url.origin === INTERNAL_ORIGIN && !url.pathname.startsWith("//");
  } catch {
    return false;
  }
}
