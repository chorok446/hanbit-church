import type { Post } from "@/data/posts";
import { CHURCH } from "@/data/church";
import { extractYouTubeId } from "@/lib/youtube";
import { isRichHtml } from "@/lib/sanitize-rich-html";
import { cleanEmptyRichParagraphs } from "@/lib/rich-body-html";

/**
 * 설교 화면 전용 파싱 계층 — Post 에는 설교 구조 필드(제목·성경 본문·설교자·요약)가 없어
 * 본문 텍스트에서 관례 패턴을 추출한다.
 *   제목: 「…」 / 『…』 / — "…" / "…"
 *   성경 본문: 괄호 안 "책이름 장:절(-절)" (예: (데살로니가전서 5:16-18), (시편 23편))
 * 나눔 질문·기도 제목은 본문에 "나눔 질문"/"기도 제목" 목록이 있으면 그걸 쓰고,
 * 없으면 샘플을 보여준다 — 실데이터가 생기면 getSermonSections 만 바꾸면 된다.
 */

/** 예배 구분. 태그(#주일예배 등)에서 유추하며 기본은 주일 설교. */
export type SermonServiceType = "SUNDAY" | "WEDNESDAY" | "DAWN" | "SPECIAL";

export const SERMON_SERVICE_LABELS: Record<SermonServiceType, string> = {
  SUNDAY: "주일 설교",
  WEDNESDAY: "수요 예배",
  DAWN: "새벽 기도",
  SPECIAL: "특별 집회",
};

/** 목록 상단 필터 칩. */
export const SERMON_FILTERS: { value: SermonServiceType | "ALL"; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "SUNDAY", label: "주일 설교" },
  { value: "WEDNESDAY", label: "수요 예배" },
  { value: "DAWN", label: "새벽 기도" },
  { value: "SPECIAL", label: "특별 집회" },
];

export type SermonInfo = {
  /** 설교 제목. 패턴 추출 실패 시 본문 앞부분을 자른 값. */
  title: string;
  /** 성경 본문 표기(예: 데살로니가전서 5:16-18). 추출 실패 시 null. */
  scripture: string | null;
  /** 제목·성경 본문·영상 URL 을 걷어낸 나머지 요약 문장. 없으면 빈 문자열. */
  summary: string;
  serviceType: SermonServiceType;
  serviceLabel: string;
  youtubeId: string | null;
  /** 설교자 표시명. 작성자가 교회 계정이면 "담임목사 {CHURCH.pastor}", 개인이면 그 이름. */
  preacher: string;
  date: string;
};

/** 작성자 → 설교자 표시명. 교회 공식 계정 글은 담임목사(CHURCH.pastor, env 주입)로 표기한다. */
export function sermonPreacherLabel(authorName: string): string {
  if (authorName !== CHURCH.name) return authorName;
  return CHURCH.pastor ? `담임목사 ${CHURCH.pastor}` : "담임목사";
}

/** 유튜브 링크(앵커 태그 포함)와 "다시듣기:" 류 라벨을 본문에서 제거 — 설교 화면 전용. */
const YOUTUBE_ANCHOR_RE =
  /<a\b[^>]*href="[^"]*(?:youtube(?:-nocookie)?\.com|youtu\.be)[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
const YOUTUBE_URL_RE =
  /(?:(?:다시\s?듣기|다시\s?보기|설교\s?영상|영상)\s*[:：]\s*)?https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be)\/[^\s<>"']*/gi;

export function stripYouTubeUrls(text: string): string {
  return text
    .replace(YOUTUBE_ANCHOR_RE, "")
    .replace(YOUTUBE_URL_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** SSR 에서도 동작해야 하므로 DOMParser 없이 정규식으로만 태그를 걷어낸다(파싱용 근사치). */
function toPlainText(text: string): string {
  const trimmed = text.trim();
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|ul|ol|div)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const TITLE_BRACKET_RE = /[「『]([^」』\n]{1,80})[」』]/;
const TITLE_DASH_QUOTE_RE = /[—–-]\s*["“‘']([^"”’'\n]{1,80})["”’']/;
const TITLE_QUOTE_RE = /["“]([^"”\n]{2,80})["”]/;
const SCRIPTURE_RE =
  /\(\s*([가-힣]{2,12}\s?\d+(?::\d+)?(?:\s?[장편])?(?:\s?\d+\s?절)?(?:\s?[-~–]\s?\d+(?::\d+)?(?:\s?절)?)?)\s*\)/;

/** "나눔 질문"/"기도 제목" 제목 줄(정확히 그 문구만 있는 줄)부터는 요약이 아니다 —
 * 전용 작성 폼(buildSermonBody)이 만든 섹션 블록이 요약에 섞이지 않게 그 앞까지만 남긴다.
 * 시드 글처럼 문장 중간에 "나눔 질문"이 등장하는 경우는 줄 전체 일치가 아니라 영향 없다. */
function stripSermonSectionBlocks(plainWithLines: string): string {
  const lines = plainWithLines.split("\n");
  const start = lines.findIndex((line) => /^\s*(?:나눔\s?질문|기도\s?제목)\s*$/.test(line));
  return (start === -1 ? lines : lines.slice(0, start)).join("\n");
}

function serviceTypeFromTags(tags: string[]): SermonServiceType {
  const joined = tags.join(" ");
  if (/수요/.test(joined)) return "WEDNESDAY";
  if (/새벽/.test(joined)) return "DAWN";
  if (/특별|부흥|집회|특새/.test(joined)) return "SPECIAL";
  return "SUNDAY";
}

/** 예배 구분 → 태그. serviceTypeFromTags 와 왕복 호환(수요/새벽/특별 키워드 포함). */
export const SERMON_SERVICE_TAGS: Record<SermonServiceType, string> = {
  SUNDAY: "#주일예배",
  WEDNESDAY: "#수요예배",
  DAWN: "#새벽기도",
  SPECIAL: "#특별집회",
};

/** 작성 폼의 성경 본문 표기가 파서(SCRIPTURE_RE)와 왕복 호환되는지 검사(예: 데살로니가전서 5:16-18). */
export function isParsableScripture(scripture: string): boolean {
  return SCRIPTURE_RE.test(`(${scripture})`);
}

export type SermonBodyInput = {
  title: string;
  scripture: string;
  serviceType: SermonServiceType;
  youtubeUrl: string;
  summary: string;
  questions: string[];
  prayers: string[];
};

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 리치 에디터 결과가 단순 문단(<p>·<br>)뿐이면 plain 텍스트로 되돌린다(시드 관례와 동일한 본문 유지). */
function richSummaryToPlain(html: string): string | null {
  if (/<(?!\/?(?:p|br)\b)[a-z]/i.test(html)) return null;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * 설교 등록 폼 입력 → parseSermonInfo/getSermonSections 가 읽는 본문 텍스트 조립.
 * 시드 글과 같은 관례를 따른다:
 *   {예배 구분} — "{제목}" ({성경 본문}).
 *   다시듣기: {유튜브 URL}          ← stripYouTubeUrls 가 라벨째 걷어낸다
 *
 *   {말씀 요약}
 *
 *   나눔 질문                        ← getSermonSections 의 목록 파서 규칙(번호/불릿)
 *   1. …
 *
 *   기도 제목
 *   - …
 *
 * 요약이 리치 HTML(굵게·목록 등)이면 같은 구조를 <p> 블록으로 조립한다 — toPlainText 가
 * 블록을 줄로 되돌리므로 파서 왕복은 동일하고, 상세 요약 렌더는 sermonSummaryRichHtml 이 맡는다.
 */
export function buildSermonBody(input: SermonBodyInput): string {
  // 제목의 따옴표는 TITLE_DASH_QUOTE_RE 왕복을 깨뜨리므로 제거한다.
  const title = input.title.replace(/["“”‘’']/g, "").replace(/\s+/g, " ").trim();
  const scripture = input.scripture.trim();
  const youtubeUrl = input.youtubeUrl.trim();
  const questions = input.questions.map((item) => item.trim()).filter(Boolean);
  const prayers = input.prayers.map((item) => item.trim()).filter(Boolean);

  let headline = `${SERMON_SERVICE_LABELS[input.serviceType]} — "${title}"`;
  if (scripture) headline += ` (${scripture})`;
  headline += ".";

  let summary = input.summary.trim();
  if (isRichHtml(summary)) {
    summary = cleanEmptyRichParagraphs(summary);
    const plain = richSummaryToPlain(summary);
    if (plain !== null) summary = plain;
  }

  if (isRichHtml(summary)) {
    const blocks = [`<p>${escapeHtmlText(headline)}</p>`];
    if (youtubeUrl) blocks.push(`<p>다시듣기: ${escapeHtmlText(youtubeUrl)}</p>`);
    blocks.push(summary);
    if (questions.length > 0) {
      blocks.push(
        "<p>나눔 질문</p>",
        ...questions.map((item, index) => `<p>${index + 1}. ${escapeHtmlText(item)}</p>`),
      );
    }
    if (prayers.length > 0) {
      blocks.push("<p>기도 제목</p>", ...prayers.map((item) => `<p>- ${escapeHtmlText(item)}</p>`));
    }
    return blocks.join("\n");
  }

  if (youtubeUrl) headline += `\n다시듣기: ${youtubeUrl}`;
  const parts = [headline, summary];
  if (questions.length > 0) {
    parts.push(["나눔 질문", ...questions.map((item, index) => `${index + 1}. ${item}`)].join("\n"));
  }
  if (prayers.length > 0) {
    parts.push(["기도 제목", ...prayers.map((item) => `- ${item}`)].join("\n"));
  }
  return parts.filter(Boolean).join("\n\n");
}

/**
 * 리치 설교 본문에서 "말씀 요약" 표시용 HTML 만 남긴다 — buildSermonBody(또는 레거시 템플릿)가
 * 만든 머리말 문단과 나눔 질문/기도 제목 블록(getSermonSections 가 따로 렌더)을 걷어낸다.
 * 걷어낸 결과가 비면 원문(유튜브 링크만 제거)을 그대로 돌려준다 — 레거시 리치 글 호환.
 */
export function sermonSummaryRichHtml(text: string): string {
  const stripped = stripYouTubeUrls(text).trim();
  let html = stripped;
  const sectionIdx = html.search(/<p[^>]*>\s*(?:나눔\s?질문|기도\s?제목)\s*<\/p>/);
  if (sectionIdx !== -1) html = html.slice(0, sectionIdx);
  html = html.replace(
    /^\s*<p[^>]*>\s*(?:주일|수요|새벽|금요|특별)\s?(?:설교|예배|기도회?|집회)\s*[—–-][\s\S]*?<\/p>/,
    "",
  );
  html = cleanEmptyRichParagraphs(html);
  return html.trim() || stripped;
}

export function parseSermonInfo(post: Post): SermonInfo {
  // 파싱은 한 줄로 접은 plain 텍스트 기준(시드·일반 설교 글은 첫 문장에 제목·본문이 온다).
  // 나눔 질문·기도 제목 블록은 getSermonSections 가 따로 읽으므로 요약에서는 잘라낸다.
  const plain = stripSermonSectionBlocks(toPlainText(stripYouTubeUrls(post.text)))
    .replace(/\s+/g, " ")
    .trim();

  const titleMatch =
    TITLE_BRACKET_RE.exec(plain) ?? TITLE_DASH_QUOTE_RE.exec(plain) ?? TITLE_QUOTE_RE.exec(plain);
  const scriptureMatch = SCRIPTURE_RE.exec(plain);

  let rest = plain;
  if (titleMatch) rest = rest.replace(titleMatch[0], " ");
  if (scriptureMatch) rest = rest.replace(scriptureMatch[0], " ");
  rest = rest
    .replace(/^\s*(?:주일|수요|새벽|금요|특별)\s?(?:설교|예배|기도회?|집회)\s*/, "")
    .replace(/^[\s.,·—–-]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const fallbackSource = rest || plain;
  const fallbackTitle =
    fallbackSource.length > 60 ? `${fallbackSource.slice(0, 60).trimEnd()}…` : fallbackSource;

  const serviceType = serviceTypeFromTags(post.tags);

  return {
    title: titleMatch?.[1].trim() || fallbackTitle || "설교 말씀",
    scripture: scriptureMatch?.[1].trim() ?? null,
    // 제목 추출에 실패하면 rest 전체가 제목으로 쓰였으므로 요약은 비운다(중복 방지).
    summary: titleMatch ? rest : "",
    serviceType,
    serviceLabel: SERMON_SERVICE_LABELS[serviceType],
    youtubeId: extractYouTubeId(post.text),
    preacher: sermonPreacherLabel(post.author.name),
    date: post.time,
  };
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/* ── 상세 하단 섹션(말씀 요약 · 나눔 질문 · 기도 제목) ─────────────────────────
 * TODO(교회 확인): 지금은 본문에 "나눔 질문"/"기도 제목" 목록이 없으면 아래 샘플을
 * 보여준다. 실데이터(전용 필드나 본문 관례)가 정해지면 getSermonSections 만 고치면 된다. */

const SAMPLE_SUMMARY =
  "이번 설교의 말씀 요약이 준비 중입니다. 예배 영상과 함께 말씀의 은혜를 나눠보세요.";

const SAMPLE_QUESTIONS = [
  "오늘 말씀 중 가장 마음에 와닿은 구절은 무엇이었나요?",
  "말씀에 비추어 볼 때, 지금 나의 삶에서 돌아보게 되는 부분은 무엇인가요?",
  "이번 한 주, 말씀을 삶으로 살아내기 위해 실천할 한 가지는 무엇인가요?",
];

const SAMPLE_PRAYERS = [
  "들은 말씀대로 살아가는 한 주가 되게 하소서.",
  "교회와 성도들의 믿음이 더욱 굳건해지게 하소서.",
  "아직 복음을 알지 못하는 이웃에게 은혜가 흘러가게 하소서.",
];

export type SermonSections = {
  summary: { text: string; sample: boolean };
  questions: { items: string[]; sample: boolean };
  prayers: { items: string[]; sample: boolean };
};

/** "나눔 질문"/"기도 제목" 제목 줄 다음의 번호·불릿 목록을 추출한다. */
function parseListSection(plainWithLines: string, heading: RegExp): string[] {
  const lines = plainWithLines.split("\n").map((line) => line.trim());
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return [];
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (items.length > 0) break;
      continue;
    }
    const match = /^(?:\d+[.)]\s*|[-•·]\s*)(.+)$/.exec(line);
    if (match) items.push(match[1].trim());
    else break;
  }
  return items;
}

export function getSermonSections(post: Post, info: SermonInfo): SermonSections {
  const plainLines = toPlainText(stripYouTubeUrls(post.text));
  const questions = parseListSection(plainLines, /나눔\s?질문/);
  const prayers = parseListSection(plainLines, /기도\s?제목/);
  return {
    summary: info.summary
      ? { text: info.summary, sample: false }
      : { text: SAMPLE_SUMMARY, sample: true },
    questions:
      questions.length > 0
        ? { items: questions, sample: false }
        : { items: SAMPLE_QUESTIONS, sample: true },
    prayers:
      prayers.length > 0
        ? { items: prayers, sample: false }
        : { items: SAMPLE_PRAYERS, sample: true },
  };
}
