// 행사 데이터는 백엔드 API가 source of truth. 타입 + 프레젠테이션 메타만 유지.
import { apiDelete, apiDeleteVoid, apiGet, apiPost, apiPut } from "@/lib/api";
import { mergeCampaignBodyForEditor } from "@/lib/rich-body-html";
import { richTextPlainLength } from "@/lib/rich-text-length";
import type { CommentPageLocationResponse } from "@/data/comments";

export type CampaignStatus = "open" | "upcoming" | "closed";
export type CampaignSearchSort = "latest" | "popular" | "deadline";
export type CampaignRecruitState = "before_recruit" | "recruiting" | "ended" | "closed";

export type CampaignDateRangeFilters = {
  recruitEndFrom: string;
  recruitEndTo: string;
  runStartFrom: string;
  runStartTo: string;
};

export type CampaignSearchParams = {
  q?: string;
  status?: CampaignStatus;
  recruitState?: CampaignRecruitState;
  availableOnly?: boolean;
  sort?: CampaignSearchSort;
  page?: number;
  size?: number;
  recruitEndFrom?: string;
  recruitEndTo?: string;
  runStartFrom?: string;
  runStartTo?: string;
};

export type CampaignDateRangeField = keyof CampaignDateRangeFilters;

export const EMPTY_CAMPAIGN_DATE_RANGE_FILTERS: CampaignDateRangeFilters = {
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

export function readCampaignDateRangeFilters(params: { get(name: string): string | null }): CampaignDateRangeFilters {
  return {
    recruitEndFrom: readIsoDate(params.get("recruitEndFrom")),
    recruitEndTo: readIsoDate(params.get("recruitEndTo")),
    runStartFrom: readIsoDate(params.get("runStartFrom")),
    runStartTo: readIsoDate(params.get("runStartTo")),
  };
}

export function appendCampaignDateRangeFilters(
  params: URLSearchParams,
  filters: CampaignDateRangeFilters,
): void {
  (Object.keys(filters) as CampaignDateRangeField[]).forEach((field) => {
    if (filters[field]) params.set(field, filters[field]);
  });
}

export function campaignDateRangeError(filters: CampaignDateRangeFilters): string | null {
  if (filters.recruitEndFrom && filters.recruitEndTo && filters.recruitEndFrom > filters.recruitEndTo) {
    return "모집 마감일의 시작일은 종료일보다 늦을 수 없습니다.";
  }
  if (filters.runStartFrom && filters.runStartTo && filters.runStartFrom > filters.runStartTo) {
    return "진행 시작일의 시작일은 종료일보다 늦을 수 없습니다.";
  }
  return null;
}

export function hasCampaignDateRangeFilters(filters: CampaignDateRangeFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export type Campaign = {
  id: string;
  status: CampaignStatus;
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
  recruitState: CampaignRecruitState;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  body: { heading: string; paragraphs: string[]; images: string[] };
  joinedByMe: boolean;
  bookmarkedByMe: boolean;
  ownedByMe: boolean;
  /** 관리자 숨김 여부. 개설자 본인 경로(mine/상세)에서만 true 로 내려온다. */
  hidden?: boolean;
  // TODO(데이터: 장소·대상·참가비 필드 백엔드 추가 필요) — 아래 5개는 백엔드 Campaign 엔티티에 아직 없어
  // 항상 undefined 로 내려온다. 값이 생기면 상세 정보 패널·행사 내용 탭에 자동 노출된다.
  place?: string | null;
  audience?: string | null;
  fee?: string | null;
  supplies?: string | null;
  contact?: string | null;
};

export type CampaignParticipant = {
  participantId: string;
  name: string;
  verified: boolean;
};

export type CampaignParticipantsResponse = {
  campaignId: string;
  title: string;
  status: CampaignStatus;
  capacity: number;
  joined: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  participants: CampaignParticipant[];
};

export type CampaignSearchResponse = {
  content: Campaign[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 마이페이지 행사 pagination 응답(참여/개설). 백엔드 CampaignPageResponse 와 1:1.
export type CampaignPageResponse = {
  content: Campaign[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const MY_CAMPAIGNS_PAGE_SIZE = 9;

function campaignsPage(path: string, page: number): Promise<CampaignPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(MY_CAMPAIGNS_PAGE_SIZE) });
  return apiGet<CampaignPageResponse>(`${path}?${params.toString()}`);
}

export const fetchJoinedCampaignsPage = (page: number) => campaignsPage("/api/campaigns/joined/page", page);
export const fetchMyCampaignsPage = (page: number) => campaignsPage("/api/campaigns/mine/page", page);
export const fetchBookmarkedCampaignsPage = (page: number) => campaignsPage("/api/campaigns/bookmarks/page", page);

export function bookmarkCampaign(campaignId: string): Promise<Campaign> {
  return apiPost<Campaign>(`/api/campaigns/${encodeURIComponent(campaignId)}/bookmark`, {});
}

export function unbookmarkCampaign(campaignId: string): Promise<Campaign> {
  return apiDelete<Campaign>(`/api/campaigns/${encodeURIComponent(campaignId)}/bookmark`);
}

export type CampaignParticipantRemovalResponse = {
  campaignId: string;
  participantId: string;
  removed: boolean;
  joined: number;
};

/** 개설자용 참가자 강제 퇴장. apiDelete 가 getSessionId() 으로 인증 헤더를 붙이며 갱신된 joined 를 반환한다. */
export function removeCampaignParticipant(
  campaignId: string,
  participantId: string,
): Promise<CampaignParticipantRemovalResponse> {
  return apiDelete<CampaignParticipantRemovalResponse>(
    `/api/campaigns/${encodeURIComponent(campaignId)}/participants/${encodeURIComponent(participantId)}`,
  );
}

export type CampaignComment = {
  id: string;
  campaignId: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  text: string;
  createdAt: string;
  ownedByMe: boolean;
  edited: boolean;
  updatedAt: string | null;
  parentId?: string | null;
  replies?: CampaignComment[];
};

export type UpdateCampaignCommentRequest = { text: string };

export type CampaignCommentsResponse = {
  content: CampaignComment[];
  page: number;
  size: number;
  // pagination 은 최상위 댓글 기준, totalComments 는 답글 포함 전체 수.
  totalElements: number;
  totalPages: number;
  totalComments?: number;
};

export function fetchCampaignCommentPageLocation(
  campaignId: string,
  commentId: string,
  size = 20,
): Promise<CommentPageLocationResponse> {
  const query = new URLSearchParams({ size: String(size) });
  return apiGet<CommentPageLocationResponse>(
    `/api/campaigns/${encodeURIComponent(campaignId)}/comments/${encodeURIComponent(commentId)}/page?${query.toString()}`,
  );
}

export function updateCampaignComment(
  campaignId: string,
  commentId: string,
  body: UpdateCampaignCommentRequest,
): Promise<CampaignComment> {
  return apiPut<CampaignComment>(
    `/api/campaigns/${encodeURIComponent(campaignId)}/comments/${encodeURIComponent(commentId)}`,
    body,
  );
}

export type CampaignProof = {
  id: string;
  campaignId: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  text: string;
  images: string[];
  createdAt: string;
  ownedByMe: boolean;
};

export type CampaignProofsResponse = {
  content: CampaignProof[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  proofedByMe: boolean;
};

export const MAX_PROOF_TEXT_LENGTH = 500;
export const MAX_PROOF_IMAGES = 4;

export function fetchCampaignProofs(
  campaignId: string,
  page: number,
  size = 6,
): Promise<CampaignProofsResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<CampaignProofsResponse>(
    `/api/campaigns/${encodeURIComponent(campaignId)}/proofs?${params.toString()}`,
  );
}

export function createCampaignProof(
  campaignId: string,
  body: { text: string; images: string[] },
): Promise<CampaignProof> {
  return apiPost<CampaignProof>(`/api/campaigns/${encodeURIComponent(campaignId)}/proofs`, body);
}

export function deleteCampaignProof(campaignId: string, proofId: string): Promise<void> {
  return apiDeleteVoid(
    `/api/campaigns/${encodeURIComponent(campaignId)}/proofs/${encodeURIComponent(proofId)}`,
  );
}

export const statusMeta: Record<CampaignStatus, { label: string; color: string; fg: string }> = {
  open: { label: "모집중", color: "#7dd3a3", fg: "#0f1f22" },
  upcoming: { label: "모집예정", color: "#148a90", fg: "#ffffff" },
  closed: { label: "모집마감", color: "rgba(120,120,130,0.7)", fg: "#ffffff" },
};

const recruitStateMeta: Record<CampaignRecruitState, { label: string; color: string; fg: string }> = {
  before_recruit: { label: "모집예정", color: "#148a90", fg: "#ffffff" },
  recruiting: { label: "모집중", color: "#7dd3a3", fg: "#0f1f22" },
  ended: { label: "모집종료", color: "rgba(120,120,130,0.7)", fg: "#ffffff" },
  closed: { label: "모집마감", color: "rgba(120,120,130,0.7)", fg: "#ffffff" },
};

export function campaignRecruitMeta(campaign: Campaign) {
  if (campaign.recruitState === "recruiting" && !campaign.recruitable && campaign.joined >= campaign.capacity) {
    return { label: "정원마감", color: "var(--danger-solid)", fg: "#ffffff" };
  }
  return recruitStateMeta[campaign.recruitState];
}

// ─── 행사 수명주기(D-day·진행률) — 카드와 상세가 동일 기준을 쓰도록 단일 util 로 관리 ───

export type CampaignPhase = "before_recruit" | "recruiting" | "recruit_closed" | "running" | "ended";

export type CampaignLifecycle = {
  phase: CampaignPhase;
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

const CAMPAIGN_PHASE_BADGES: Record<CampaignPhase, { label: string; color: string; fg: string }> = {
  before_recruit: { label: "모집예정", color: "#148a90", fg: "#ffffff" },
  recruiting: { label: "모집중", color: "#7dd3a3", fg: "#0f1f22" },
  recruit_closed: { label: "모집마감", color: "rgba(120,120,130,0.7)", fg: "#ffffff" },
  running: { label: "진행중", color: "#3c5a96", fg: "#ffffff" },
  ended: { label: "종료", color: "rgba(120,120,130,0.55)", fg: "#ffffff" },
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
export function campaignLifecycle(campaign: Campaign, todayMs: number = todayUtc()): CampaignLifecycle {
  const runStart = parseIsoDateUtc(campaign.runStart);
  const runEnd = parseIsoDateUtc(campaign.runEnd);

  // 1) 진행 기간 기준: 진행 종료일이 지났으면 종료, 진행 시작일이 지났으면 진행중.
  if (runEnd !== null && todayMs > runEnd) {
    return { phase: "ended", badge: CAMPAIGN_PHASE_BADGES.ended, dday: "종료된 행사입니다" };
  }
  if (runStart !== null && todayMs >= runStart) {
    const left = runEnd !== null ? daysUntil(runEnd, todayMs) : null;
    const dday = left === null
      ? "진행 중인 행사입니다"
      : left === 0
        ? "오늘 행사 종료"
        : `행사 종료까지 D-${left}`;
    return { phase: "running", badge: CAMPAIGN_PHASE_BADGES.running, dday };
  }

  // 2) 진행 시작 전: 모집 상태 기준.
  if (campaign.recruitState === "before_recruit") {
    const recruitStart = parseIsoDateUtc(campaign.recruitStart);
    const until = recruitStart !== null ? daysUntil(recruitStart, todayMs) : null;
    const dday = until !== null && until > 0 ? `모집 시작까지 D-${until}` : "모집 시작 예정";
    return { phase: "before_recruit", badge: CAMPAIGN_PHASE_BADGES.before_recruit, dday };
  }
  if (campaign.recruitState === "recruiting" && campaign.recruitable) {
    const recruitEnd = parseIsoDateUtc(campaign.recruitEnd);
    const left = recruitEnd !== null ? daysUntil(recruitEnd, todayMs) : null;
    const dday = left === null
      ? "모집 중"
      : left <= 0
        ? "오늘 모집 마감"
        : `모집 마감까지 D-${left}`;
    return { phase: "recruiting", badge: CAMPAIGN_PHASE_BADGES.recruiting, dday };
  }

  // 3) 모집이 끝났고(마감·정원마감·모집종료) 아직 행사 시작 전.
  const full = campaign.recruitState === "recruiting" && campaign.capacity > 0 && campaign.joined >= campaign.capacity;
  const untilStart = runStart !== null ? daysUntil(runStart, todayMs) : null;
  const dday = untilStart !== null && untilStart > 0 ? `행사 시작까지 D-${untilStart}` : "행사 시작 대기";
  const badge = full
    ? { label: "정원마감", color: "var(--danger-solid)", fg: "#ffffff" }
    : CAMPAIGN_PHASE_BADGES.recruit_closed;
  return { phase: "recruit_closed", badge, dday };
}

/** 진행률 라벨: "N% 모집 완료". 정원 미정(capacity<=0)이면 null. */
export function campaignProgressLabel(campaign: Campaign): string | null {
  if (campaign.capacity <= 0) return null;
  const pct = Math.max(0, Math.min(100, Math.round((campaign.joined / campaign.capacity) * 100)));
  return `${pct}% 모집 완료`;
}

/** 백엔드 CampaignValidators 와 동일한 제한. */
export const CAMPAIGN_MAX_CAPACITY = 10_000;
export const CAMPAIGN_MAX_BODY_LENGTH = 8000;

export const CAMPAIGN_COMPOSE_DRAFT_KEY = "dasida:campaign-compose-draft";

export type CampaignComposeValues = {
  title: string;
  summary: string;
  body: string;
  thumb: string;
  recruitStart: string;
  recruitEnd: string;
  runStart: string;
  runEnd: string;
  capacity: string;
};

export type CampaignComposePayload = Omit<CampaignComposeValues, "capacity"> & { capacity: number };

export type CampaignComposeField =
  | "title"
  | "summary"
  | "body"
  | "thumb"
  | "recruitStart"
  | "recruitEnd"
  | "runStart"
  | "runEnd"
  | "capacity";

export type CampaignComposeValidationResult =
  | { ok: true; payload: CampaignComposePayload }
  | { ok: false; message: string; field?: CampaignComposeField };

export function isValidCampaignImageUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export const DEFAULT_CAMPAIGN_COMPOSE_VALUES: CampaignComposeValues = {
  title: "",
  summary: "",
  body: "",
  thumb: "",
  recruitStart: "2026-07-01",
  recruitEnd: "2026-07-31",
  runStart: "2026-08-05",
  runEnd: "2026-08-30",
  capacity: "30",
};

export function campaignToComposeValues(campaign: Campaign): CampaignComposeValues {
  return {
    title: campaign.title,
    summary: campaign.summary,
    body: mergeCampaignBodyForEditor(campaign.body.paragraphs, campaign.body.images),
    thumb: campaign.thumb,
    recruitStart: campaign.recruitStart,
    recruitEnd: campaign.recruitEnd,
    runStart: campaign.runStart,
    runEnd: campaign.runEnd,
    capacity: String(campaign.capacity),
  };
}

export function validateCampaignCompose(values: CampaignComposeValues): CampaignComposeValidationResult {
  const title = values.title.trim();
  if (!title) {
    return { ok: false, message: "행사 제목을 입력해주세요.", field: "title" };
  }

  const thumb = values.thumb.trim();
  if (thumb && !isValidCampaignImageUrl(thumb)) {
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
  if (capacity > CAMPAIGN_MAX_CAPACITY) {
    return {
      ok: false,
      message: `모집 인원은 ${CAMPAIGN_MAX_CAPACITY.toLocaleString()}명 이하여야 합니다.`,
      field: "capacity",
    };
  }

  const dateFields: { key: CampaignComposeField; value: string; label: string }[] = [
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
  if (bodyPlainLength > CAMPAIGN_MAX_BODY_LENGTH) {
    return {
      ok: false,
      message: `본문은 ${CAMPAIGN_MAX_BODY_LENGTH.toLocaleString()}자 이하여야 합니다.`,
      field: "body",
    };
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
    },
  };
}
