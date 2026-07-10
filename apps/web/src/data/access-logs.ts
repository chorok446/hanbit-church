import { apiDelete, apiGet } from "@/lib/api";

export type AccessLogItem = {
  id: number;
  ipAddress: string;
  os: string;
  /** User-Agent 기반 브라우저 이름. */
  browser?: string;
  /** IP 기반 대략적 위치("지역 · 국가"). 조회 실패 시 null. */
  location?: string | null;
  accessedAt: string;
  /** 이 기록이 현재 로그인 세션에서 만들어졌는지(백엔드 JWT sid 기준). */
  currentSession?: boolean;
  /** 로그인 세션 식별자 — 원격 로그아웃 호출에 쓴다. 과거 기록은 null. */
  sessionId?: string | null;
  /** 원격 로그아웃 가능 여부(비현재 세션·토큰 수명 내·미해지). */
  sessionRevocable?: boolean;
  /** 이미 원격 로그아웃된 세션. */
  sessionRevoked?: boolean;
};

export type SessionRevokeResponse = { revoked: boolean; sessionId: string };

/** 원격 세션 로그아웃 — 그 세션의 access·refresh 가 모두 무효화된다. */
export function revokeSession(sessionId: string): Promise<SessionRevokeResponse> {
  return apiDelete<SessionRevokeResponse>(`/api/auth/sessions/${encodeURIComponent(sessionId)}`);
}

export type AccessLogPageResponse = {
  content: AccessLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

const PAGE_SIZE = 15;

export function fetchAccessLogsPage(page: number): Promise<AccessLogPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  return apiGet<AccessLogPageResponse>(`/api/auth/access-logs?${params}`);
}
