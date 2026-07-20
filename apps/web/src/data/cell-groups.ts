// 소그룹/목장(구역) 데이터 계층 (백엔드 /api/cell-groups 연동).
//
// 목장 정보·로스터·모임(스케줄·참석·나눔)은 백엔드(cellgroup 패키지)에 저장되고,
// 이 파일은 타입과 fetch 함수만 제공한다. 접근 권한(매니저·리더·멤버)은 서버가 판정한다
// — 403 은 화면에서 안내로 처리한다. 상세 응답의 canManage/canManageRoster 로 편집 UI 를 게이트한다.

import { apiDeleteVoid, apiGet, apiPost, apiPut } from "@/lib/api";

// ─── 역할·상태 ───

/** 백엔드 CellGroupMemberRole enum 과 1:1. */
export type CellMemberRole = "LEADER" | "MEMBER";

export const CELL_MEMBER_ROLE_LABELS: Record<CellMemberRole, string> = {
  LEADER: "리더",
  MEMBER: "목장원",
};

/** 백엔드 CellMeetingAttendanceStatus enum 과 1:1. */
export type CellAttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export const CELL_ATTENDANCE_STATUSES: CellAttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED"];

export const CELL_ATTENDANCE_LABELS: Record<CellAttendanceStatus, string> = {
  PRESENT: "참석",
  ABSENT: "결석",
  EXCUSED: "사유결석",
};

/** 참석 상태 배지 색 — CSS 토큰만 사용(새 원색 도입 없음). */
export function attendanceStyle(status: CellAttendanceStatus): { background: string; color: string } {
  switch (status) {
    case "PRESENT":
      return { background: "var(--accent-soft)", color: "var(--accent-strong)" };
    case "EXCUSED":
      return { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--heading)" };
    default:
      return { background: "var(--danger-soft)", color: "var(--danger)" };
  }
}

// ─── 타입 ───

export type CellGroupSummary = {
  id: string;
  name: string;
  district?: string | null;
  leaderUserId?: number | null;
  leaderName?: string | null;
  memberCount: number;
  active: boolean;
  /** 요청자가 이 목장 소속(멤버·리더)인지. */
  mine: boolean;
};

export type CellGroupMember = {
  userId: number;
  name: string;
  role: CellMemberRole;
  /** ISO instant. */
  joinedAt: string;
};

export type CellMeetingAttendance = {
  userId: number;
  name: string;
  status: CellAttendanceStatus;
};

export type CellMeeting = {
  id: string;
  title: string;
  /** ISO instant. */
  meetAt: string;
  location?: string | null;
  agenda?: string | null;
  sharingNote?: string | null;
  attendance: CellMeetingAttendance[];
  createdAt: string;
  updatedAt: string;
};

export type CellGroupDetail = {
  id: string;
  name: string;
  district?: string | null;
  leaderUserId?: number | null;
  leaderName?: string | null;
  description?: string | null;
  active: boolean;
  members: CellGroupMember[];
  meetings: CellMeeting[];
  /** 리더·매니저 — 정보·모임 편집 가능. */
  canManage: boolean;
  /** 매니저 — 로스터 편집 가능. */
  canManageRoster: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CellGroupCandidate = {
  id: number;
  name: string;
};

// ─── 요청 본문 ───

export type SaveCellGroupInput = {
  name: string;
  district?: string;
  description?: string;
  /** 매니저 전용 — 그 외 요청자에겐 서버가 무시한다. */
  leaderUserId?: number | null;
  /** 매니저 전용. */
  active?: boolean;
};

export type SaveCellMeetingInput = {
  title: string;
  /** ISO instant. */
  meetAt: string;
  location?: string;
  agenda?: string;
  sharingNote?: string;
  attendance: { userId: number; status: CellAttendanceStatus }[];
};

// ─── API ───

/** 목장 디렉터리 — 매니저는 비활성 포함 전체, 그 외 회원은 활성만. */
export function fetchCellGroups(): Promise<CellGroupSummary[]> {
  return apiGet<CellGroupSummary[]>("/api/cell-groups");
}

/** 내가 속한(멤버·리더) 목장. */
export function fetchMyCellGroups(): Promise<CellGroupSummary[]> {
  return apiGet<CellGroupSummary[]>("/api/cell-groups/mine");
}

/** 목장 상세 — 정보·로스터·모임. 권한 없으면 403(ApiError). */
export function fetchCellGroup(id: string): Promise<CellGroupDetail> {
  return apiGet<CellGroupDetail>(`/api/cell-groups/${encodeURIComponent(id)}`);
}

/** 로스터 추가 후보 검색(매니저 전용). */
export function searchCellCandidates(q: string): Promise<CellGroupCandidate[]> {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiGet<CellGroupCandidate[]>(`/api/cell-groups/candidates${query}`);
}

export function createCellGroup(input: SaveCellGroupInput): Promise<CellGroupDetail> {
  return apiPost<CellGroupDetail>("/api/cell-groups", input);
}

export function updateCellGroup(id: string, input: SaveCellGroupInput): Promise<CellGroupDetail> {
  return apiPut<CellGroupDetail>(`/api/cell-groups/${encodeURIComponent(id)}`, input);
}

export function deleteCellGroup(id: string): Promise<void> {
  return apiDeleteVoid(`/api/cell-groups/${encodeURIComponent(id)}`);
}

/** 로스터 전체 교체(매니저 전용). */
export function saveCellGroupMembers(
  id: string,
  members: { userId: number; role: CellMemberRole }[],
): Promise<CellGroupDetail> {
  return apiPut<CellGroupDetail>(`/api/cell-groups/${encodeURIComponent(id)}/members`, { members });
}

export function createCellMeeting(id: string, input: SaveCellMeetingInput): Promise<CellMeeting> {
  return apiPost<CellMeeting>(`/api/cell-groups/${encodeURIComponent(id)}/meetings`, input);
}

export function updateCellMeeting(
  id: string,
  meetingId: string,
  input: SaveCellMeetingInput,
): Promise<CellMeeting> {
  return apiPut<CellMeeting>(
    `/api/cell-groups/${encodeURIComponent(id)}/meetings/${encodeURIComponent(meetingId)}`,
    input,
  );
}

export function deleteCellMeeting(id: string, meetingId: string): Promise<void> {
  return apiDeleteVoid(
    `/api/cell-groups/${encodeURIComponent(id)}/meetings/${encodeURIComponent(meetingId)}`,
  );
}

// ─── 표시 헬퍼 ───

/** ISO instant → "7월 24일 (금) 오전 10:00" 로컬 라벨. */
export function meetingWhenLabel(meetAt: string): string {
  const date = new Date(meetAt);
  if (Number.isNaN(date.getTime())) return meetAt;
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** ISO instant → yyyy-MM-dd (로컬). 날짜 input value·표시용. */
export function toDateInputValue(meetAt: string): string {
  const date = new Date(meetAt);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** ISO instant → HH:mm (로컬). 시간 input value 용. */
export function toTimeInputValue(meetAt: string): string {
  const date = new Date(meetAt);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** 로컬 날짜(yyyy-MM-dd) + 시간(HH:mm) → ISO instant. 저장용. 잘못된 입력이면 null. */
export function toInstant(dateValue: string, timeValue: string): string | null {
  if (!dateValue) return null;
  const composed = new Date(`${dateValue}T${timeValue || "00:00"}`);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString();
}

/** 참석 요약 — "참석 5 · 결석 1 · 사유 2" (0 은 생략). 기록이 없으면 빈 문자열. */
export function attendanceSummary(attendance: CellMeetingAttendance[]): string {
  if (attendance.length === 0) return "";
  const counts: Record<CellAttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, EXCUSED: 0 };
  for (const row of attendance) counts[row.status] += 1;
  return CELL_ATTENDANCE_STATUSES.filter((status) => counts[status] > 0)
    .map((status) => `${CELL_ATTENDANCE_LABELS[status]} ${counts[status]}`)
    .join(" · ");
}
