// unsplash CDN 이미지의 반응형 srcSet 생성.
// photos.ts/시드가 만드는 URL 은 w= 파라미터를 갖는 images.unsplash.com 패턴이라
// 폭만 바꿔 여러 해상도 후보를 만들 수 있다. 그 외 소스(업로드 등)는 손대지 않는다.
const WIDTHS = [400, 700, 1000] as const;

export function unsplashSrcSet(src: string): string | undefined {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }
  if (url.hostname !== "images.unsplash.com" || !url.searchParams.has("w")) return undefined;
  return WIDTHS.map((width) => {
    const variant = new URL(url);
    variant.searchParams.set("w", String(width));
    return `${variant} ${width}w`;
  }).join(", ");
}

/** 카드 그리드 기본 sizes — 모바일 1열(화면폭), 그 이상은 카드폭(~400px). */
export const CARD_IMAGE_SIZES = "(max-width: 640px) 100vw, 400px";
