import DOMPurify from "isomorphic-dompurify";
import { isAllowedImageUrl } from "@/lib/image-url";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a", "img"],
  ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "loading", "referrerpolicy"],
  ALLOW_DATA_ATTR: false,
};

let hooksReady = false;

function ensurePurifyHooks() {
  if (hooksReady) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "A") return;
    const href = node.getAttribute("href") ?? "";
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      node.removeAttribute("href");
      return;
    }
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "IMG") return;
    // 이미지는 https 만 허용(로컬 http 예외) — mixed content·추적 픽셀 방어. 링크(a href)는 탐색이라 http 유지.
    if (!isAllowedImageUrl(node.getAttribute("src") ?? "")) {
      node.remove();
      return;
    }
    // 외부 호스트에 열람 페이지 URL(리퍼러)을 넘기지 않는다 — 추적 표면 축소.
    node.setAttribute("referrerpolicy", "no-referrer");
  });
  hooksReady = true;
}

export function sanitizeRichHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  // isRichHtml 판별과 무관하게 항상 정화한다 — 결과는 innerHTML 로 들어가므로,
  // 태그 판별 정규식이 놓치는 마크업 파편(`</script>` 등)도 이스케이프돼야 안전하다.
  ensurePurifyHooks();
  return DOMPurify.sanitize(trimmed, PURIFY_CONFIG);
}

export function isRichHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}
