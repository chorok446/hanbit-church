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
  if (!isRichHtml(trimmed)) return trimmed;
  ensurePurifyHooks();
  return DOMPurify.sanitize(trimmed, PURIFY_CONFIG);
}

export function isRichHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}
