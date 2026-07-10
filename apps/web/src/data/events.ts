// 행사 데이터는 백엔드 API가 source of truth. 타입 + 프레젠테이션 메타만 유지.
import { apiDelete, apiDeleteVoid, apiGet, apiPost, apiPut, apiPatch } from "@/lib/api";
import { mergeEventBodyForEditor } from "@/lib/rich-body-html";
import { richTextPlainLength } from "@/lib/rich-text-length";
import type { CommentPageLocationResponse } from "@/data/comments";

export type EventStatus = "open" | "upcoming" | "closed";
export type EventSearchSort = "latest" | "popular" | "deadline" | "relevance";
export type EventRecruitState = "before_recruit" | "recruiting" | "ended" | "closed";

export type EventDateRangeFilters = {
  recruitEndFrom: string;
  recruitEndTo: string;
  runStartFrom: string;
  runStartTo: string;
};

export type EventSearchParams = {
  q?: string;
  status?: EventStatus;
  recruitState?: EventRecruitState;
  availableOnly?: boolean;
  sort?: EventSearchSort;
  page?: number;
  size?: number;
  recruitEndFrom?: string;
  recruitEndTo?: string;
  runStartFrom?: string;
  runStartTo?: string;
};

export type EventDateRangeField = keyof EventDateRangeFilters;

export const EMPTY_EVENT_DATE_RANGE_FILTERS: EventDateRangeFilters = {
  recruitEndFrom: "",
  recruitEndTo: "",
  runStartFrom: "",
  runStartTo: "",
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function readIsoDate(value: string | null): string {
  const trimmed = value?.trim() ?? "";
  return isIsoDate(trimmed) ? trimmed : "";
}

export function readEventDateRangeFilters(params: { get(name: string): string | null }): EventDateRangeFilters {
  return {
    recruitEndFrom: readIsoDate(params.get("recruitEndFrom")),
    recruitEndTo: readIsoDate(params.get("recruitEndTo")),
    runStartFrom: readIsoDate(params.get("runStartFrom")),
    runStartTo: readIsoDate(params.get("runStartTo")),
  };
}

export function appendEventDateRangeFilters(
  params: URLSearchParams,
  filters: EventDateRangeFilters,
): void {
  (Object.keys(filters) as EventDateRangeField[]).forEach((field) => {
    if (filters[field]) params.set(field, filters[field]);
  });
}

export function eventDateRangeError(filters: EventDateRangeFilters): string | null {
  if (filters.recruitEndFrom && filters.recruitEndTo && filters.recruitEndFrom > filters.recruitEndTo) {
    return "모집 마감일의 시작일은 종료일보다 늦을 수 없습니다.";
  }
  if (filters.runStartFrom && filters.runStartTo && filters.runStartFrom > filters.runStartTo) {
    return "진행 시작일의 시작일은 종료일보다 늦을 수 없습니다.";
  }
  return null;
}

export function hasEventDateRangeFilters(filters: EventDateRangeFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export type Event = {
  id: string;
  status: EventStatus;
  title: string;
  summary: string;
  thumb: string;
  recruitStart: string;
  recruitEnd: string;
  runStart: string;
  runEnd: string;
  capacity: number;
  joined: number;
  daysLeftLabel: string;
  recruitable: boolean;
  recruitState: EventRecruitState;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  body: { heading: string; paragraphs: string[]; images: string[] };
  joinedByMe: boolean;
  bookmarkedByMe: boolean;
  ownedByMe: boolean;
  /** 내용 수정 여부 — 상세에서 '수정됨' 표시(게시글과 대칭). */
  edited?: boolean;
  /** 관리자 숨김 여부. 개설자 본인 경로(mine/상세)에서만 true 로 내려온다. */
  hidden?: boolean;
  // 실무 안내(전부 선택). 값이 없으면 상세 정보 패널·행사 내용 탭에서 해당 행을 숨긴다.
  place?: string | null;
  audience?: string | null;
  fee?: string | null;
  supplies?: string | null;
  contact?: string | null;
};

export type EventParticipant = {
  participantId: string;
  name: string;
  verified: boolean;
};

export type EventParticipantsResponse = {
  eventId: string;
  title: string;
  status: EventStatus;
  capacity: number;
  joined: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  participants: EventParticipant[];
};

export type EventSearchResponse = {
  content: Event[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 마이페이지 행사 pagination 응답(참여/개설). 백엔드 EventPageResponse 와 1:1.
export type EventPageResponse = {
  content: Event[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const MY_EVENTS_PAGE_SIZE = 9;

function eventsPage(path: string, page: number): Promise<EventPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(MY_EVENTS_PAGE_SIZE) });
  return apiGet<EventPageResponse>(`${path}?${params.toString()}`);
}

export const fetchJoinedEventsPage = (page: number) => eventsPage("/api/events/joined/page", page);
export const fetchMyEventsPage = (page: number) => eventsPage("/api/events/mine/page", page);
/** 모집중 행사 정원 증원(개설자 전용) — 늘리기만 허용, 감원·미정 전환은 서버가 400. */
export function increaseEventCapacity(eventId: string, capacity: number): Promise<Event> {
  return apiPatch<Event>(`/api/events/${eventId}/capacity`, { capacity });
}

export const fetchBookmarkedEventsPage = (page: number) => eventsPage("/api/events/bookmarks/page", page);

export function bookmarkEvent(eventId: string): Promise<Event> {
  return apiPost<Event>(`/api/events/${encodeURIComponent(eventId)}/bookmark`, {});
}

export function unbookmarkEvent(eventId: string): Promise<Event> {
  return apiDelete<Event>(`/api/events/${encodeURIComponent(eventId)}/bookmark`);
}

export type EventParticipantRemovalResponse = {
  eventId: string;
  participantId: string;
  removed: boolean;
  joined: number;
};

/** 개설자용 참가자 강제 퇴장. apiDelete 가 getSessionId() 으로 인증 헤더를 붙이며 갱신된 joined 를 반환한다. */
export function removeEventParticipant(
  eventId: string,
  participantId: string,
): Promise<EventParticipantRemovalResponse> {
  return apiDelete<EventParticipantRemovalResponse>(
    `/api/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}`,
  );
}

export type EventComment = {
  id: string;
  eventId: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  text: string;
  createdAt: string;
  ownedByMe: boolean;
  edited: boolean;
  updatedAt: string | null;
  parentId?: string | null;
  replies?: EventComment[];
};

export type UpdateEventCommentRequest = { text: string };

export type EventCommentsResponse = {
  content: EventComment[];
  page: number;
  size: number;
  // pagination 은 최상위 댓글 기준, totalComments 는 답글 포함 전체 수.
  totalElements: number;
  totalPages: number;
  totalComments?: number;
};

export function fetchEventCommentPageLocation(
  eventId: string,
  commentId: string,
  size = 20,
): Promise<CommentPageLocationResponse> {
  const query = new URLSearchParams({ size: String(size) });
  return apiGet<CommentPageLocationResponse>(
    `/api/events/${encodeURIComponent(eventId)}/comments/${encodeURIComponent(commentId)}/page?${query.toString()}`,
  );
}

export function updateEventComment(
  eventId: string,
  commentId: string,
  body: UpdateEventCommentRequest,
): Promise<EventComment> {
  return apiPut<EventComment>(
    `/api/events/${encodeURIComponent(eventId)}/comments/${encodeURIComponent(commentId)}`,
    body,
  );
}

export type EventProof = {
  id: string;
  eventId: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  text: string;
  images: string[];
  createdAt: string;
  ownedByMe: boolean;
};

export type EventProofsResponse = {
  content: EventProof[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  proofedByMe: boolean;
};

export const MAX_PROOF_TEXT_LENGTH = 500;
export const MAX_PROOF_IMAGES = 4;

export function fetchEventProofs(
  eventId: string,
  page: number,
  size = 6,
): Promise<EventProofsResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<EventProofsResponse>(
    `/api/events/${encodeURIComponent(eventId)}/proofs?${params.toString()}`,
  );
}

export function createEventProof(
  eventId: string,
  body: { text: string; images: string[] },
): Promise<EventProof> {
  return apiPost<EventProof>(`/api/events/${encodeURIComponent(eventId)}/proofs`, body);
}

export function deleteEventProof(eventId: string, proofId: string): Promise<void> {
  return apiDeleteVoid(
    `/api/events/${encodeURIComponent(eventId)}/proofs/${encodeURIComponent(proofId)}`,
  );
}

export const statusMeta: Record<EventStatus, { label: string; color: string; fg: string }> = {
  open: { label: "모집중", color: "var(--success)", fg: "var(--on-success)" },
  upcoming: { label: "모집예정", color: "rgba(31,42,68,0.82)", fg: "var(--on-banner)" },
  closed: { label: "모집마감", color: "rgba(31,42,68,0.6)", fg: "var(--on-banner)" },
};

const recruitStateMeta: Record<EventRecruitState, { label: string; color: string; fg: string }> = {
  before_recruit: { label: "모집예정", color: "rgba(31,42,68,0.82)", fg: "var(--on-banner)" },
  recruiting: { label: "모집중", color: "var(--success)", fg: "var(--on-success)" },
  ended: { label: "모집종료", color: "rgba(31,42,68,0.6)", fg: "var(--on-banner)" },
  closed: { label: "모집마감", color: "rgba(31,42,68,0.6)", fg: "var(--on-banner)" },
};

export function eventRecruitMeta(event: Event) {
  if (event.recruitState === "recruiting" && !event.recruitable && event.joined >= event.capacity) {
    return { label: "정원마감", color: "var(--danger-solid)", fg: "#ffffff" };
  }
  return recruitStateMeta[event.recruitState];
}

// ─── 행사 수명주기(D-day·진행률) — 카드와 상세가 동일 기준을 쓰도록 단일 util 로 관리 ───

export type EventPhase = "before_recruit" | "recruiting" | "recruit_closed" | "running" | "ended";

export type EventLifecycle = {
  phase: EventPhase;
  /** 상태 배지(모집예정/모집중/모집마감/진행중/종료). */
  badge: { label: string; color: string; fg: string };
  /**
   * D-day 라벨 — 기준일을 문구에 명시한다.
   * 모집예정: "모집 시작까지 D-N"(모집 시작일 기준)
   * 모집중: "모집 마감까지 D-N"(모집 종료일 기준)
   * 모집마감(마감·정원마감·모집종료): "행사 시작까지 D-N"(진행 시작일 기준)
   * 진행중: "행사 종료까지 D-N"(진행 종료일 기준)
   * 종료: "종료된 행사입니다"
   */
  dday: string;
};

const EVENT_PHASE_BADGES: Record<EventPhase, { label: string; color: string; fg: string }> = {
  before_recruit: { label: "모집예정", color: "rgba(31,42,68,0.82)", fg: "var(--on-banner)" },
  recruiting: { label: "모집중", color: "var(--success)", fg: "var(--on-success)" },
  recruit_closed: { label: "모집마감", color: "rgba(31,42,68,0.6)", fg: "var(--on-banner)" },
  running: { label: "진행중", color: "rgba(31,42,68,0.82)", fg: "var(--on-banner)" },
  ended: { label: "종료", color: "rgba(31,42,68,0.45)", fg: "var(--on-banner)" },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDateUtc(value: string): number | null {
  const trimmed = value.trim();
  if (!isIsoDate(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function todayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(target: number, today: number): number {
  return Math.round((target - today) / DAY_MS);
}

/**
 * 행사 수명주기 계산. 진행 기간(runStart~runEnd)은 날짜로 판정하고,
 * 모집 여부는 백엔드가 내려주는 recruitState/recruitable 을 신뢰한다(카드·상세 공통 기준).
 */
export function eventLifecycle(event: Event, todayMs: number = todayUtc()): EventLifecycle {
  const runStart = parseIsoDateUtc(event.runStart);
  const runEnd = parseIsoDateUtc(event.runEnd);

  // 1) 진행 기간 기준: 진행 종료일이 지났으면 종료, 진행 시작일이 지났으면 진행중.
  if (runEnd !== null && todayMs > runEnd) {
    return { phase: "ended", badge: EVENT_PHASE_BADGES.ended, dday: "종료된 행사입니다" };
  }
  if (runStart !== null && todayMs >= runStart) {
    const left = runEnd !== null ? daysUntil(runEnd, todayMs) : null;
    const dday = left === null
      ? "진행 중인 행사입니다"
      : left === 0
        ? "오늘 행사 종료"
        : `행사 종료까지 D-${left}`;
    return { phase: "running", badge: EVENT_PHASE_BADGES.running, dday };
  }

  // 2) 진행 시작 전: 모집 상태 기준.
  if (event.recruitState === "before_recruit") {
    const recruitStart = parseIsoDateUtc(event.recruitStart);
    const until = recruitStart !== null ? daysUntil(recruitStart, todayMs) : null;
    const dday = until !== null && until > 0 ? `모집 시작까지 D-${until}` : "모집 시작 예정";
    return { phase: "before_recruit", badge: EVENT_PHASE_BADGES.before_recruit, dday };
  }
  if (event.recruitState === "recruiting" && event.recruitable) {
    const recruitEnd = parseIsoDateUtc(event.recruitEnd);
    const left = recruitEnd !== null ? daysUntil(recruitEnd, todayMs) : null;
    const dday = left === null
      ? "모집 중"
      : left <= 0
        ? "오늘 모집 마감"
        : `모집 마감까지 D-${left}`;
    return { phase: "recruiting", badge: EVENT_PHASE_BADGES.recruiting, dday };
  }

  // 3) 모집이 끝났고(마감·정원마감·모집종료) 아직 행사 시작 전.
  const full = event.recruitState === "recruiting" && event.capacity > 0 && event.joined >= event.capacity;
  const untilStart = runStart !== null ? daysUntil(runStart, todayMs) : null;
  const dday = untilStart !== null && untilStart > 0 ? `행사 시작까지 D-${untilStart}` : "행사 시작 대기";
  const badge = full
    ? { label: "정원마감", color: "var(--danger-solid)", fg: "#ffffff" }
    : EVENT_PHASE_BADGES.recruit_closed;
  return { phase: "recruit_closed", badge, dday };
}

/** 진행률 라벨: "N% 모집 완료". 정원 미정(capacity<=0)이면 null. */
export function eventProgressLabel(event: Event): string | null {
  if (event.capacity <= 0) return null;
  const pct = Math.max(0, Math.min(100, Math.round((event.joined / event.capacity) * 100)));
  return `${pct}% 모집 완료`;
}

/** 백엔드 EventValidators 와 동일한 제한. */
export const EVENT_MAX_CAPACITY = 10_000;
export const EVENT_MAX_BODY_LENGTH = 8000;
export const EVENT_MAX_INFO_LENGTH = 200;
export const EVENT_MAX_SUPPLIES_LENGTH = 500;

export const EVENT_COMPOSE_DRAFT_KEY = "hanbit:event-compose-draft";

export type EventComposeValues = {
  title: string;
  summary: string;
  body: string;
  thumb: string;
  recruitStart: string;
  recruitEnd: string;
  runStart: string;
  runEnd: string;
  capacity: string;
  // 실무 안내(전부 선택) — 비우면 상세에서 해당 행이 숨겨진다.
  place: string;
  audience: string;
  fee: string;
  supplies: string;
  contact: string;
};

export type EventComposePayload = Omit<EventComposeValues, "capacity"> & { capacity: number };

export type EventComposeField =
  | "title"
  | "summary"
  | "body"
  | "thumb"
  | "recruitStart"
  | "recruitEnd"
  | "runStart"
  | "runEnd"
  | "capacity"
  | "place"
  | "audience"
  | "fee"
  | "supplies"
  | "contact";

export type EventComposeValidationResult =
  | { ok: true; payload: EventComposePayload }
  | { ok: false; message: string; field?: EventComposeField };

export function isValidEventImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export const DEFAULT_EVENT_COMPOSE_VALUES: EventComposeValues = {
  title: "",
  summary: "",
  body: "",
  thumb: "",
  recruitStart: "2026-07-01",
  recruitEnd: "2026-07-31",
  runStart: "2026-08-05",
  runEnd: "2026-08-30",
  capacity: "30",
  place: "",
  audience: "",
  fee: "",
  supplies: "",
  contact: "",
};

export function eventToComposeValues(event: Event): EventComposeValues {
  return {
    title: event.title,
    summary: event.summary,
    body: mergeEventBodyForEditor(event.body.paragraphs, event.body.images),
    thumb: event.thumb,
    recruitStart: event.recruitStart,
    recruitEnd: event.recruitEnd,
    runStart: event.runStart,
    runEnd: event.runEnd,
    capacity: String(event.capacity),
    place: event.place ?? "",
    audience: event.audience ?? "",
    fee: event.fee ?? "",
    supplies: event.supplies ?? "",
    contact: event.contact ?? "",
  };
}

export function validateEventCompose(values: EventComposeValues): EventComposeValidationResult {
  const title = values.title.trim();
  if (!title) {
    return { ok: false, message: "행사 제목을 입력해주세요.", field: "title" };
  }

  const thumb = values.thumb.trim();
  if (thumb && !isValidEventImageUrl(thumb)) {
    return {
      ok: false,
      message: "썸네일 URL은 http:// 또는 https:// 로 시작해야 합니다.",
      field: "thumb",
    };
  }

  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { ok: false, message: "모집 인원은 1 이상의 정수여야 합니다.", field: "capacity" };
  }
  if (capacity > EVENT_MAX_CAPACITY) {
    return {
      ok: false,
      message: `모집 인원은 ${EVENT_MAX_CAPACITY.toLocaleString()}명 이하여야 합니다.`,
      field: "capacity",
    };
  }

  const dateFields: { key: EventComposeField; value: string; label: string }[] = [
    { key: "recruitStart", value: values.recruitStart, label: "모집 시작일" },
    { key: "recruitEnd", value: values.recruitEnd, label: "모집 종료일" },
    { key: "runStart", value: values.runStart, label: "진행 시작일" },
    { key: "runEnd", value: values.runEnd, label: "진행 종료일" },
  ];

  for (const field of dateFields) {
    if (!field.value.trim()) {
      return { ok: false, message: `${field.label}을(를) 입력해주세요.`, field: field.key };
    }
    if (!isIsoDate(field.value)) {
      return { ok: false, message: `${field.label}은(는) yyyy-MM-dd 형식이어야 합니다.`, field: field.key };
    }
  }

  const { recruitStart, recruitEnd, runStart, runEnd } = values;
  if (recruitStart > recruitEnd) {
    return {
      ok: false,
      message: "모집 시작일은 모집 종료일보다 늦을 수 없습니다.",
      field: "recruitEnd",
    };
  }
  if (recruitEnd > runStart) {
    return {
      ok: false,
      message: "모집 종료일은 진행 시작일보다 늦을 수 없습니다.",
      field: "recruitEnd",
    };
  }
  if (recruitEnd > runEnd) {
    return {
      ok: false,
      message: "모집 종료일은 진행 종료일보다 늦을 수 없습니다.",
      field: "recruitEnd",
    };
  }
  if (runStart > runEnd) {
    return {
      ok: false,
      message: "진행 시작일은 진행 종료일보다 늦을 수 없습니다.",
      field: "runEnd",
    };
  }

  const bodyPlainLength = richTextPlainLength(values.body);
  if (bodyPlainLength > EVENT_MAX_BODY_LENGTH) {
    return {
      ok: false,
      message: `본문은 ${EVENT_MAX_BODY_LENGTH.toLocaleString()}자 이하여야 합니다.`,
      field: "body",
    };
  }

  // 실무 안내(선택) — 백엔드 normalizeOptionalInfo 와 동일한 길이 제한.
  const infoFields: { key: EventComposeField; value: string; label: string; max: number }[] = [
    { key: "place", value: values.place, label: "장소", max: EVENT_MAX_INFO_LENGTH },
    { key: "audience", value: values.audience, label: "대상", max: EVENT_MAX_INFO_LENGTH },
    { key: "fee", value: values.fee, label: "참가비", max: EVENT_MAX_INFO_LENGTH },
    { key: "supplies", value: values.supplies, label: "준비물", max: EVENT_MAX_SUPPLIES_LENGTH },
    { key: "contact", value: values.contact, label: "문의", max: EVENT_MAX_INFO_LENGTH },
  ];
  for (const field of infoFields) {
    if (field.value.trim().length > field.max) {
      return { ok: false, message: `${field.label}은(는) ${field.max}자 이하여야 합니다.`, field: field.key };
    }
  }

  return {
    ok: true,
    payload: {
      title,
      summary: values.summary.trim(),
      body: values.body.trim(),
      thumb,
      recruitStart,
      recruitEnd,
      runStart,
      runEnd,
      capacity,
      place: values.place.trim(),
      audience: values.audience.trim(),
      fee: values.fee.trim(),
      supplies: values.supplies.trim(),
      contact: values.contact.trim(),
    },
  };
}
