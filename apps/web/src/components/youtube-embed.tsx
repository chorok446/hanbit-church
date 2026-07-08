import { youTubeEmbedUrl } from "@/lib/youtube";

/** 유튜브 임베드(16:9). 본문 링크 감지 결과를 받아 렌더한다. */
export function YouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9", background: "#000" }}>
      <iframe
        src={youTubeEmbedUrl(videoId)}
        title={title ?? "유튜브 영상"}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
