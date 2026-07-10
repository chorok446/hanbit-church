import { apiGet } from "@/lib/api";

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
};

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
