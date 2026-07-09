// 찬양팀 내부 운영 데이터 계층 (P1 — 백엔드 /api/praise 연동).
//
// 콘티·곡·파트 배정·공지·참석은 백엔드(praise 패키지)에 저장되고, 이 파일은
// 타입과 fetch 함수만 제공한다. 회원별 찬양팀 역할/파트(praiseRole/praiseParts)는
// /api/auth/me, PATCH /api/admin/users/{id}/praise 로 관리된다.
// 접근 권한(멤버 조회·리더 쓰기)은 서버(PraiseService)가 판정한다 — 403 은 화면에서 안내로 처리.

import { ApiError, apiDeleteVoid, apiFetch, apiGet, apiGetOrNull, apiPatch, apiPost, apiPut } from "@/lib/api";

// ─── 파트·역할 ───

/** 백엔드 PraisePart enum 과 1:1. */
export type PraisePart =
  | "LEADER"
  | "VOCAL"
  | "KEYBOARD"
  | "ELECTRIC_GUITAR"
  | "ACOUSTIC_GUITAR"
  | "BASS"
  | "DRUMS"
  | "SOUND"
  | "MEDIA"
  | "LYRICS";

export const PRAISE_PARTS: PraisePart[] = [
  "LEADER",
  "VOCAL",
  "KEYBOARD",
  "ELECTRIC_GUITAR",
  "ACOUSTIC_GUITAR",
  "BASS",
  "DRUMS",
  "SOUND",
  "MEDIA",
  "LYRICS",
];

export const PRAISE_PART_LABELS: Record<PraisePart, string> = {
  LEADER: "인도",
  VOCAL: "싱어",
  KEYBOARD: "건반",
  ELECTRIC_GUITAR: "일렉 기타",
  ACOUSTIC_GUITAR: "어쿠스틱 기타",
  BASS: "베이스",
  DRUMS: "드럼",
  SOUND: "음향",
  MEDIA: "영상",
  LYRICS: "자막",
};

/** 모르는 문자열(신규 파트 등)이 와도 깨지지 않도록 원문을 그대로 돌려준다. */
export function praisePartLabel(part: string): string {
  return PRAISE_PART_LABELS[part as PraisePart] ?? part;
}

/** 백엔드 PraiseRole enum 과 1:1. */
export type PraiseTeamRole = "LEADER" | "MEMBER" | "GUEST";

export const PRAISE_ROLE_LABELS: Record<PraiseTeamRole, string> = {
  LEADER: "리더",
  MEMBER: "멤버",
  GUEST: "게스트",
};

// ─── 참석 상태 ───

/** 백엔드 PraiseAttendanceStatus enum 과 1:1. */
export type PraiseAttendanceStatus = "PENDING" | "AVAILABLE" | "LATE" | "UNAVAILABLE";

export const ATTENDANCE_STATUS_LABELS: Record<PraiseAttendanceStatus, string> = {
  PENDING: "미응답",
  AVAILABLE: "참석",
  LATE: "지각",
  UNAVAILABLE: "불참",
};

/** 참석 상태 배지 색 — CSS 토큰만 사용(새 원색 도입 없음). */
export function attendanceStatusStyle(status: PraiseAttendanceStatus): {
  background: string;
  color: string;
} {
  switch (status) {
    case "AVAILABLE":
      return { background: "var(--accent-soft)", color: "var(--accent-strong)" };
    case "LATE":
      return { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--heading)" };
    case "UNAVAILABLE":
      return { background: "var(--danger-soft)", color: "var(--danger)" };
    default:
      return { background: "var(--chip-bg)", color: "var(--foreground-muted)" };
  }
}

// ─── 콘티(세트리스트) ───

export type PraiseSongLink = {
  label: string;
  /** 외부 자료(악보·데모 영상 등) — 항상 새 탭으로 연다. */
  url: string;
};

export type PraiseSongType = "worship" | "praise";

export const PRAISE_SONG_TYPE_LABELS: Record<PraiseSongType, string> = {
  worship: "경배",
  praise: "찬양",
};

export type PraiseSetlistSong = {
  /** 새 곡은 "" 로 보내면 서버가 채번한다. */
  id: string;
  /** 콘티 안 순서(1부터) — 저장 시 서버가 배열 순서로 다시 채번한다. */
  order: number;
  title: string;
  /** 조성 (예: "G", "Am"). */
  key: string;
  bpm: number;
  type: PraiseSongType;
  links: PraiseSongLink[];
  /** 곡 전체 메모(구성·전조 등). 가사 전문은 저작권 문제로 싣지 않는다 — 곡명·키·BPM만. */
  note?: string | null;
  /** 파트별 메모. */
  partNotes?: Partial<Record<PraisePart, string>> | null;
};

export type PraiseAssignment = {
  id: string;
  userId: number;
  name: string;
  part: string;
  status: PraiseAttendanceStatus;
  memo?: string | null;
};

export type PraiseNotice = {
  id: string;
  title: string;
  body: string;
  author: string;
  /** yyyy-MM-dd */
  date: string;
  pinned?: boolean;
};

/** 백엔드 PraiseSetlistStatus enum 과 1:1. */
export type PraiseSetlistStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "ARCHIVED";

export const SETLIST_STATUSES: PraiseSetlistStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "COMPLETED",
  "ARCHIVED",
];

export const SETLIST_STATUS_LABELS: Record<PraiseSetlistStatus, string> = {
  DRAFT: "준비 중",
  CONFIRMED: "확정",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};

export type PraiseSetlistSummary = {
  id: string;
  title: string;
  /** yyyy-MM-dd */
  worshipDate: string;
  /** 예배 구분 표시 문구 (예: "주일 2부 예배"). */
  worshipType: string;
  /** 표시용 시각 (예: "오전 11:00"). */
  serviceTime?: string | null;
  location?: string | null;
  status: PraiseSetlistStatus;
  songCount: number;
  assignmentCount: number;
  createdAt: string;
};

export type PraiseSetlist = {
  id: string;
  title: string;
  worshipDate: string;
  worshipType: string;
  /** 리허설 안내 문구. */
  rehearsalTime?: string | null;
  serviceTime?: string | null;
  location?: string | null;
  leaderUserId?: number | null;
  status: PraiseSetlistStatus;
  songs: PraiseSetlistSong[];
  notices: PraiseNotice[];
  assignments: PraiseAssignment[];
  createdAt: string;
  updatedAt: string;
};

export type PraiseMember = {
  id: number;
  name: string;
  praiseRole: PraiseTeamRole;
  praiseParts: string[];
};

/** 콘티 생성/수정 요청 본문 — 곡·공지는 전체 교체(replace). */
export type SavePraiseSetlistInput = {
  title: string;
  worshipDate: string;
  worshipType: string;
  rehearsalTime?: string;
  serviceTime?: string;
  location?: string;
  status: PraiseSetlistStatus;
  songs: PraiseSetlistSong[];
  notices: PraiseNotice[];
};

// ─── 팀 일정 ───

/** 백엔드 PraiseScheduleType enum 과 1:1. */
export type PraiseScheduleType = "REHEARSAL" | "PART_PRACTICE" | "FULL_PRACTICE" | "WORSHIP" | "ETC";

export const PRAISE_SCHEDULE_TYPES: PraiseScheduleType[] = [
  "REHEARSAL",
  "PART_PRACTICE",
  "FULL_PRACTICE",
  "WORSHIP",
  "ETC",
];

export const PRAISE_SCHEDULE_TYPE_LABELS: Record<PraiseScheduleType, string> = {
  REHEARSAL: "리허설",
  PART_PRACTICE: "파트 연습",
  FULL_PRACTICE: "전체 연습",
  WORSHIP: "예배 지원",
  ETC: "기타",
};

/** 백엔드 PraiseScheduleVisibility enum 과 1:1 — PRIVATE=팀 내부, CHURCH=교인 공개, PUBLIC=외부 공개. */
export type PraiseScheduleVisibility = "PRIVATE" | "CHURCH" | "PUBLIC";

export const SCHEDULE_VISIBILITIES: PraiseScheduleVisibility[] = ["PRIVATE", "CHURCH", "PUBLIC"];

export const SCHEDULE_VISIBILITY_LABELS: Record<PraiseScheduleVisibility, string> = {
  PRIVATE: "팀 내부",
  CHURCH: "교회 공개",
  PUBLIC: "외부 공개",
};

export type PraiseSchedule = {
  id: string;
  title: string;
  type: PraiseScheduleType;
  /** ISO-8601 instant. */
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  memo?: string | null;
  visibility: PraiseScheduleVisibility;
  setlistId?: string | null;
  /** 연결 콘티 제목(표시용). 콘티가 없거나 삭제됐으면 null. */
  setlistTitle?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavePraiseScheduleInput = {
  title: string;
  type: PraiseScheduleType;
  startAt: string;
  endAt?: string;
  location?: string;
  memo?: string;
  visibility: PraiseScheduleVisibility;
  setlistId?: string;
};

export type PraiseSetlistPage = {
  content: PraiseSetlistSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PraiseUploadedFile = {
  url: string;
  /** "image" | "pdf" */
  kind: string;
  name: string;
};

export type PraiseRemindResult = {
  /** 실제 알림을 보낸 인원 수(리더 본인 제외). */
  remindedCount: number;
  /** 미응답(PENDING) 배정 인원 수. */
  pendingCount: number;
};

/** 곡 라이브러리 항목 — 과거 콘티 곡을 곡명 기준 집계한 것. */
export type PraiseSongLibraryEntry = {
  title: string;
  key: string;
  bpm: number;
  type: PraiseSongType;
  useCount: number;
  /** 마지막 사용 예배일(yyyy-MM-dd). */
  lastUsedDate: string;
};

// ─── API ───

export function fetchPraiseSetlistPage(params: { page?: number; size?: number } = {}): Promise<PraiseSetlistPage> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  return apiGet<PraiseSetlistPage>(`/api/praise/setlists?${query.toString()}`);
}

/** 대시보드용 최근 콘티 요약(첫 페이지 50건 — 다음 예배 선택에는 충분하다). */
export async function fetchPraiseSetlists(): Promise<PraiseSetlistSummary[]> {
  const page = await fetchPraiseSetlistPage({ page: 0, size: 50 });
  return page.content;
}

/** 콘티 단건. 없으면(404) null. */
export function fetchPraiseSetlist(id: string): Promise<PraiseSetlist | null> {
  return apiGetOrNull<PraiseSetlist>(`/api/praise/setlists/${encodeURIComponent(id)}`);
}

export function createPraiseSetlist(input: SavePraiseSetlistInput): Promise<PraiseSetlist> {
  return apiPost<PraiseSetlist>("/api/praise/setlists", input);
}

export function updatePraiseSetlist(id: string, input: SavePraiseSetlistInput): Promise<PraiseSetlist> {
  return apiPut<PraiseSetlist>(`/api/praise/setlists/${encodeURIComponent(id)}`, input);
}

export function deletePraiseSetlist(id: string): Promise<void> {
  return apiDeleteVoid(`/api/praise/setlists/${encodeURIComponent(id)}`);
}

/** 배정 전체 교체(리더 전용). 유지되는 (userId, part) 조합의 참석 응답은 서버가 보존한다. */
export function savePraiseAssignments(
  id: string,
  assignments: { userId: number; part: string }[],
): Promise<PraiseSetlist> {
  return apiPut<PraiseSetlist>(`/api/praise/setlists/${encodeURIComponent(id)}/assignments`, {
    assignments,
  });
}

/** 본인 참석 응답 저장 — 본인 배정이 없으면 404(ApiError). */
export function saveMyAttendance(
  id: string,
  input: { status: PraiseAttendanceStatus; memo: string },
): Promise<PraiseAssignment[]> {
  return apiPatch<PraiseAssignment[]>(`/api/praise/setlists/${encodeURIComponent(id)}/attendance`, {
    status: input.status,
    memo: input.memo.trim() || null,
  });
}

/** 미응답자에게 참석 리마인드 발송(리더 전용). */
export function remindPendingAttendance(id: string): Promise<PraiseRemindResult> {
  return apiPost<PraiseRemindResult>(`/api/praise/setlists/${encodeURIComponent(id)}/attendance/remind`, {});
}

/** 찬양팀 팀원 목록 — 이름·역할·파트만(이메일·연락처 비노출). */
export function fetchPraiseMembers(): Promise<PraiseMember[]> {
  return apiGet<PraiseMember[]>("/api/praise/members");
}

/** 곡 라이브러리 — 과거 콘티 곡을 곡명 기준 집계(멤버 전용). q 로 곡명 검색. */
export function fetchPraiseSongLibrary(q?: string): Promise<PraiseSongLibraryEntry[]> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiGet<PraiseSongLibraryEntry[]>(`/api/praise/songs${query}`);
}

/** 팀 일정(멤버 전용 — PRIVATE 포함 전체). includePast=true 면 지난 일정도. */
export function fetchPraiseSchedules(includePast = false): Promise<PraiseSchedule[]> {
  return apiGet<PraiseSchedule[]>(`/api/praise/schedules${includePast ? "?includePast=true" : ""}`);
}

/**
 * 교회 캘린더 합류용 공개 일정. 요청자에 따라 서버가 범위를 좁힌다 —
 * 찬양팀 멤버·관리자: 전체(PRIVATE 포함), 로그인 교인: CHURCH+PUBLIC, 비로그인: PUBLIC.
 */
export function fetchPublicPraiseSchedules(): Promise<PraiseSchedule[]> {
  return apiGet<PraiseSchedule[]>("/api/praise/schedules/public");
}

export function createPraiseSchedule(input: SavePraiseScheduleInput): Promise<PraiseSchedule> {
  return apiPost<PraiseSchedule>("/api/praise/schedules", input);
}

export function updatePraiseSchedule(id: string, input: SavePraiseScheduleInput): Promise<PraiseSchedule> {
  return apiPut<PraiseSchedule>(`/api/praise/schedules/${encodeURIComponent(id)}`, input);
}

export function deletePraiseSchedule(id: string): Promise<void> {
  return apiDeleteVoid(`/api/praise/schedules/${encodeURIComponent(id)}`);
}

/**
 * 찬양팀 자료 업로드(리더 전용) — 악보 사진(jpeg/png/webp, 5MB)·PDF(10MB).
 * 반환 URL 은 인증 서빙 엔드포인트(GET /api/praise/files/{name})를 가리킨다 — 찬양팀 멤버만 접근 가능.
 * 이미지는 <img src>(같은 사이트 쿠키 자동 전송)로 인라인 표시, PDF 는 새 탭에서 다운로드된다.
 */
export async function uploadPraiseFile(file: File): Promise<PraiseUploadedFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/api/praise/files", { method: "POST", body: form });
  if (!res.ok) throw new ApiError(res.status, "/api/praise/files", undefined, await res.json().catch(() => undefined));
  return res.json() as Promise<PraiseUploadedFile>;
}

/** 링크 URL 이 업로드된 이미지(악보 사진)인지 — 콘티 상세 인라인 미리보기 판단용. */
export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url);
}

// ─── 조회 헬퍼 ───

/** ISO instant → 로컬 yyyy-MM-dd (캘린더 dateKey·표시용). */
export function scheduleDateKey(startAt: string): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return startAt.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** ISO instant → "오전 8:30" 형태의 로컬 시각 라벨. */
export function scheduleTimeLabel(startAt: string): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

/** yyyy-MM-dd (로컬 기준 오늘). */
function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * 대시보드 "이번 주 예배" 선택 — 오늘 이후(오늘 포함) 가장 가까운 콘티,
 * 없으면 가장 최근 콘티. 보관(ARCHIVED)은 제외한다.
 */
export function pickUpcomingSetlist(summaries: PraiseSetlistSummary[]): PraiseSetlistSummary | null {
  const active = summaries.filter((setlist) => setlist.status !== "ARCHIVED");
  if (active.length === 0) return null;
  const today = todayKey();
  const upcoming = active
    .filter((setlist) => setlist.worshipDate >= today)
    .sort((a, b) => a.worshipDate.localeCompare(b.worshipDate));
  if (upcoming.length > 0) return upcoming[0];
  return [...active].sort((a, b) => b.worshipDate.localeCompare(a.worshipDate))[0];
}

/** 공지 정렬(고정 우선·최신순). 서버도 같은 순서로 주지만 화면 조합용으로 유지한다. */
export function sortPraiseNotices(notices: PraiseNotice[]): PraiseNotice[] {
  return [...notices].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
}
