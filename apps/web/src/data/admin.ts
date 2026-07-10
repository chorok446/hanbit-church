import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { ReportReason, ReportStatus, ReportTargetType } from "@/data/reports";

export type AdminSummary = {
  users: number;
  posts: number;
  events: number;
  pendingReports: number;
  totalReports: number;
  suspendedUsers: number;
  /** 모집중 & 마감일 3일 이내(경과 포함) — 마감 처리 대기 행사 수. */
  closingSoonEvents: number;
};

export type AdminReportTarget = {
  excerpt: string;
  authorName: string;
  href: string;
  hidden: boolean;
};

export type AdminReportItem = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail: string | null;
  time: string;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  reporter: { id: number; name: string; email: string | null };
  /** 대상이 이미 삭제됐으면 null */
  target: AdminReportTarget | null;
  targetReportCount: number;
};

export type AdminReportsPageResponse = {
  content: AdminReportItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  pendingCount: number;
};

export function fetchAdminSummary(): Promise<AdminSummary> {
  return apiGet<AdminSummary>("/api/admin/summary");
}

export type AdminDailyStat = {
  /** YYYY-MM-DD (KST) */
  date: string;
  signups: number;
  posts: number;
  events: number;
  reports: number;
  /** 일별 활성 회원(접속 기록 distinct 사용자). */
  activeUsers?: number;
};

export type AdminStatsResponse = {
  days: number;
  daily: AdminDailyStat[];
};

export function fetchAdminStats(days: number): Promise<AdminStatsResponse> {
  return apiGet<AdminStatsResponse>(`/api/admin/stats?days=${days}`);
}

export function fetchAdminReports(params: {
  status?: ReportStatus | "";
  targetType?: ReportTargetType | "";
  page?: number;
  size?: number;
}): Promise<AdminReportsPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.status) query.set("status", params.status);
  if (params.targetType) query.set("targetType", params.targetType);
  return apiGet<AdminReportsPageResponse>(`/api/admin/reports?${query.toString()}`);
}

export function resolveAdminReport(
  reportId: string,
  body: { status: Exclude<ReportStatus, "PENDING">; note?: string; hideContent?: boolean },
): Promise<AdminReportItem> {
  return apiPatch<AdminReportItem>(`/api/admin/reports/${reportId}`, body);
}

export type ContentVisibilityResponse = {
  targetType: ReportTargetType;
  targetId: string;
  hidden: boolean;
};

export type AdminUserItem = {
  id: number;
  email: string;
  name: string;
  verified: boolean;
  role: "USER" | "ADMIN" | "OPERATOR" | "MINISTRY" | "NEW_FAMILY" | "CONTENT";
  deleted: boolean;
  suspended: boolean;
  suspendedUntil: string | null;
  suspendedReason: string | null;
  /** 가입 시각(ISO-8601). 가입일 기록 도입 이전 회원은 null. */
  createdAt: string | null;
  postCount: number;
  eventCount: number;
  /** 가입 승인 대기 여부(승인제). */
  pendingApproval: boolean;
  /** 찬양팀 역할(LEADER/MEMBER/GUEST) — null 이면 미지정. */
  praiseRole: "LEADER" | "MEMBER" | "GUEST" | null;
  /** 찬양팀 파트 목록(백엔드 PraisePart 문자열). */
  praiseParts: string[];
};

export type AdminUsersPageResponse = {
  content: AdminUserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function fetchAdminUsers(params: {
  q?: string;
  suspended?: boolean;
  page?: number;
  size?: number;
}): Promise<AdminUsersPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.q) query.set("q", params.q);
  if (params.suspended) query.set("suspended", "true");
  return apiGet<AdminUsersPageResponse>(`/api/admin/users?${query.toString()}`);
}

/** 가입 승인 대기 회원 목록(오래 기다린 순). */
export function fetchPendingUsers(params: { page?: number; size?: number } = {}): Promise<AdminUsersPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  return apiGet<AdminUsersPageResponse>(`/api/admin/users/pending?${query.toString()}`);
}

/** 가입 승인 — 이후 해당 회원이 로그인할 수 있다. */
export function approveUser(userId: number): Promise<AdminUserItem> {
  return apiPatch<AdminUserItem>(`/api/admin/users/${userId}/approve`, {});
}

/** 가입 거절 — 계정을 비활성화한다(같은 이메일 재가입 가능). */
export function rejectUser(userId: number): Promise<AdminUserItem> {
  return apiPatch<AdminUserItem>(`/api/admin/users/${userId}/reject`, {});
}

/** 회원 역할 변경(승격/강등). DB role 을 매 요청 읽으므로 기존 토큰에도 즉시 반영된다. 본인 역할은 변경 불가(400). */
export function setAdminUserRole(userId: number, role: "USER" | "ADMIN" | "OPERATOR" | "MINISTRY" | "NEW_FAMILY" | "CONTENT"): Promise<AdminUserItem> {
  return apiPatch<AdminUserItem>(`/api/admin/users/${userId}/role`, { role });
}

/** 찬양팀 역할·파트 지정(해제는 praiseRole: null). ADMIN 전용. */
export function setPraiseRole(
  userId: number,
  body: { praiseRole: "LEADER" | "MEMBER" | "GUEST" | null; praiseParts: string[] },
): Promise<AdminUserItem> {
  return apiPatch<AdminUserItem>(`/api/admin/users/${userId}/praise`, body);
}

export type AdminPasswordResetResponse = { userId: number; tempPassword: string };

/** 비밀번호 초기화 — 임시 비밀번호는 이 응답에서만 노출된다(서버는 해시만 저장). ADMIN 전용. */
export function resetAdminUserPassword(userId: number): Promise<AdminPasswordResetResponse> {
  return apiPost<AdminPasswordResetResponse>(`/api/admin/users/${userId}/password-reset`, {});
}

/** 회원 정지(suspendedUntil 미래 시각) 또는 해제(null). 로그인·기존 토큰이 즉시 차단된다. */
export function setAdminUserSuspension(
  userId: number,
  body: { suspendedUntil: string | null; reason?: string },
): Promise<AdminUserItem> {
  return apiPatch<AdminUserItem>(`/api/admin/users/${userId}/suspension`, body);
}

export type AdminActionType =
  | "REPORT_RESOLVED"
  | "REPORT_DISMISSED"
  | "CONTENT_HIDDEN"
  | "CONTENT_RESTORED"
  | "USER_SUSPENDED"
  | "USER_UNSUSPENDED"
  | "ROLE_CHANGED"
  | "USER_APPROVED"
  | "PASSWORD_RESET"
  | "USER_REJECTED"
  | "PRAISE_ROLE_CHANGED";

export type AdminActionLogItem = {
  id: number;
  action: AdminActionType;
  /** REPORT/USER 또는 콘텐츠 타입(POST, POST_COMMENT, EVENT, EVENT_COMMENT) */
  targetType: string;
  targetId: string;
  /** 처리 메모/숨김 사유/정지 기간·사유 */
  detail: string | null;
  createdAt: string;
  admin: { id: number; name: string; email: string | null };
};

export type AdminActionLogsPageResponse = {
  content: AdminActionLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function fetchAdminLogs(params: {
  action?: AdminActionType | "";
  page?: number;
  size?: number;
}): Promise<AdminActionLogsPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.action) query.set("action", params.action);
  return apiGet<AdminActionLogsPageResponse>(`/api/admin/logs?${query.toString()}`);
}

export type BulkContentItem = { targetType: ReportTargetType; targetId: string };
export type ContentVisibilityBulkResponse = {
  requested: number;
  processed: number;
  missing: BulkContentItem[];
  hidden: boolean;
};

/** 콘텐츠 일괄 숨김/복구(최대 50건). 404 항목은 건너뛰고 missing 으로 보고된다. */
export function setAdminContentVisibilityBulk(
  items: BulkContentItem[],
  body: { hidden: boolean; reason?: string },
): Promise<ContentVisibilityBulkResponse> {
  return apiPatch<ContentVisibilityBulkResponse>("/api/admin/content/bulk", { items, ...body });
}

/** 콘텐츠 숨김(soft hide)/복구. 작성자에게 알림이 발송된다. */
export function setAdminContentVisibility(
  targetType: ReportTargetType,
  targetId: string,
  body: { hidden: boolean; reason?: string },
): Promise<ContentVisibilityResponse> {
  return apiPatch<ContentVisibilityResponse>(
    `/api/admin/content/${targetType}/${encodeURIComponent(targetId)}`,
    body,
  );
}

/** 콘텐츠 관리 목록 항목(게시글·행사 공통). */
export type AdminContentItem = {
  targetType: "POST" | "EVENT";
  id: string;
  title: string;
  category: string | null;
  authorName: string;
  hidden: boolean;
  hiddenReason: string | null;
  deleted: boolean;
};

export type AdminContentPageResponse = {
  content: AdminContentItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** 관리자 콘텐츠 목록 — 숨김 포함, hiddenOnly 로 숨김만. */
export function fetchAdminContentPage(params: {
  type: "POST" | "EVENT";
  hiddenOnly?: boolean;
  page?: number;
  size?: number;
  /** 본문·제목/작성자 검색어. */
  q?: string;
}): Promise<AdminContentPageResponse> {
  const query = new URLSearchParams({
    type: params.type,
    hiddenOnly: String(params.hiddenOnly ?? false),
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  return apiGet<AdminContentPageResponse>(`/api/admin/content?${query.toString()}`);
}
