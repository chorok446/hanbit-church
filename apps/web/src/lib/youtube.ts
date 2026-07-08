/**
 * 텍스트(plain 또는 리치 HTML)에서 첫 유튜브 영상 id 를 찾는다.
 * sanitizer 에 iframe 을 허용하는 대신, 렌더 시점에 링크를 감지해 임베드로 보여주는 방식
 * (설교 "다시듣기" 링크 등). 지원: watch?v=, youtu.be/, shorts/, embed/, live/.
 */
const YOUTUBE_RE =
  /(?:https?:\/\/)(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^"'\s<]*?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;

export function extractYouTubeId(text: string): string | null {
  return YOUTUBE_RE.exec(text)?.[1] ?? null;
}

/** 개인정보 보호 도메인의 임베드 URL. */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
