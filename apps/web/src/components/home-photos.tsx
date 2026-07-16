import { FallbackImage } from "@/components/fallback-image";
import { worshipPhotos } from "@/data/photos";

// TODO(교회 확인: 실제 사진 교체) — 실사진이 준비되기 전까지 임시 사진을 쓴다.
// 섬김 사진은 로컬 정적 이미지(Pexels, 출처: public/images/IMAGE_SOURCES.md), 예배 사진은 아직 unsplash 풀.
const PHOTOS = [
  {
    src: worshipPhotos[1],
    alt: "은은한 조명 아래 손을 들어 함께 드리는 예배",
    caption: "함께 드리는 예배",
  },
  {
    src: "/images/seed/serve/food-packing-pexels-6995260.webp",
    alt: "이웃에게 전할 나눔 도시락을 포장하는 봉사자들의 손",
    caption: "지역과 이웃을 향한 섬김",
  },
] as const;

/** 홈 중간 예배·공동체 분위기 사진 인터루드. */
export function HomePhotos() {
  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <p
          className="mx-auto text-center text-[20px] leading-[1.6] sm:text-[24px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          함께 예배하고,
          <br />
          함께 자라 가는 공동체
        </p>
        <p
          className="mx-auto mt-4 mb-10 max-w-[46ch] text-center text-[14px] leading-7"
          style={{ color: "var(--foreground-muted)", textWrap: "balance" }}
        >
          예배의 자리에서 함께 하나님을 바라보고, 삶의 자리에서 서로를 격려하며 걸어갑니다.
        </p>
        {/* 사진은 테두리 없는 라운드 프레임 — 카드 섹션들과의 반복감을 줄인다. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
          {PHOTOS.map(({ src, alt, caption }, index) => (
            <figure key={src} className="m-0 flex flex-col">
              <div
                className={`overflow-hidden rounded-3xl ${index === 0 ? "aspect-[16/10]" : "aspect-[16/10] sm:aspect-auto sm:min-h-0 sm:flex-1"}`}
                style={{ background: "var(--card)" }}
              >
                <FallbackImage src={src} alt={alt} className="h-full w-full object-cover" />
              </div>
              <figcaption
                className="mt-3 flex items-center gap-2 text-[12.5px]"
                style={{ color: "var(--foreground-muted)" }}
              >
                <span aria-hidden className="h-px w-5 shrink-0" style={{ background: "var(--accent)" }} />
                {caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
