// 관리자 권한 매핑. 백엔드 UserRole(User.kt)·SecurityConfig 의 경로 정책과 1:1 로 맞춘다.
//
// 역할: ADMIN(최고 관리자) / OPERATOR(운영자) / MINISTRY(사역 담당자)
//       / NEW_FAMILY(새가족 담당자) / CONTENT(콘텐츠 관리자) / USER(일반)
// UI 는 이 플래그만 보고 렌더링하므로 정책이 바뀌면 매핑만 수정한다.

export type StaffRole = "ADMIN" | "OPERATOR" | "MINISTRY" | "NEW_FAMILY" | "CONTENT";
export type UserRole = StaffRole | "USER";

export const STAFF_ROLES: StaffRole[] = ["ADMIN", "OPERATOR", "MINISTRY", "NEW_FAMILY", "CONTENT"];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: "일반",
  ADMIN: "최고 관리자",
  OPERATOR: "운영자",
  MINISTRY: "사역 담당자",
  NEW_FAMILY: "새가족 담당자",
  CONTENT: "콘텐츠 관리자",
};

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as StaffRole);
}

/** 목장(소그룹) 매니저 — 그룹·로스터를 관리하는 사역 스태프. 백엔드 CellGroupAccess.MANAGER_ROLES 와 1:1. */
export const CELL_GROUP_MANAGER_ROLES: UserRole[] = ["ADMIN", "OPERATOR", "MINISTRY"];

export function isCellGroupManager(role: string | null | undefined): boolean {
  return CELL_GROUP_MANAGER_ROLES.includes(role as UserRole);
}

export type AdminPermissions = {
  /** 신고 검토·처리 (최고 관리자·운영자) */
  canManageReports: boolean;
  /** 회원 검색 (최고 관리자·운영자) — 정지·역할 변경은 최고 관리자만(백엔드 강제) */
  canManageUsers: boolean;
  /** 가입 승인·거절 (최고 관리자·운영자) */
  canApproveSignups: boolean;
  /** 새가족 신청 확인·연락 (최고 관리자·운영자·새가족 담당자) */
  canManageNewFamily: boolean;
  /** 감사 로그 열람 (최고 관리자) */
  canViewAuditLog: boolean;
  /** 공지·주보 작성 등 콘텐츠 관리 (최고 관리자·운영자·콘텐츠 관리자) */
  canManageContent: boolean;
  /** 행사 개설·관리 (최고 관리자·운영자·사역 담당자) */
  canManageEvents: boolean;
  /** 교회 일정(수동 등록) 관리 (최고 관리자·운영자) */
  canManageCalendar: boolean;
};

const NONE_GRANTED: AdminPermissions = {
  canManageReports: false,
  canManageUsers: false,
  canApproveSignups: false,
  canManageNewFamily: false,
  canViewAuditLog: false,
  canManageContent: false,
  canManageEvents: false,
  canManageCalendar: false,
};

/** 역할 → 권한 매핑. 백엔드 SecurityConfig·PostService 정책과 동일하게 유지할 것. */
export const rolePermissions: Record<UserRole, AdminPermissions> = {
  ADMIN: {
    canManageReports: true,
    canManageUsers: true,
    canApproveSignups: true,
    canManageNewFamily: true,
    canViewAuditLog: true,
    canManageContent: true,
    canManageEvents: true,
    canManageCalendar: true,
  },
  OPERATOR: {
    ...NONE_GRANTED,
    canManageReports: true,
    canManageUsers: true,
    canApproveSignups: true,
    canManageNewFamily: true,
    canManageContent: true,
    canManageEvents: true,
    canManageCalendar: true,
  },
  MINISTRY: { ...NONE_GRANTED, canManageEvents: true },
  NEW_FAMILY: { ...NONE_GRANTED, canManageNewFamily: true },
  CONTENT: { ...NONE_GRANTED, canManageContent: true },
  USER: NONE_GRANTED,
};

/** 프로필 role 문자열에서 권한을 얻는다(로딩 중·비로그인·모르는 값은 권한 없음). */
export function getAdminPermissions(role: string | null | undefined): AdminPermissions {
  // own property 만 인정한다 — `in` 은 프로토타입 체인("toString" 등)까지 잡아 상속 함수를 반환해 버린다.
  const known = role != null && Object.prototype.hasOwnProperty.call(rolePermissions, role);
  return known ? rolePermissions[role as UserRole] : rolePermissions.USER;
}
