/**
 * 게시글·행사 이미지로 허용할 URL 인지. https 만 허용해 추적 픽셀·mixed content 를 막고,
 * http 는 로컬 개발(localhost·127.0.0.1 업로드 서빙)만 예외. 백엔드 isAllowedImageUrl 과 동일 규칙이며
 * 이 프로젝트의 이미지 URL 정책 단일 출처다.
 */
export function isAllowedImageUrl(url: string): boolean {
  const src = url.trim();
  const scheme = src.toLowerCase();
  if (scheme.startsWith("https://")) return true;
  if (!scheme.startsWith("http://")) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}
