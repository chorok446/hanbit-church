import { describe, expect, it } from "vitest";
import {
  getAdminPermissions,
  isStaffRole,
  rolePermissions,
  STAFF_ROLES,
  type AdminPermissions,
} from "./permissions";

describe("isStaffRole", () => {
  it("스태프 역할은 true", () => {
    for (const role of STAFF_ROLES) expect(isStaffRole(role)).toBe(true);
  });
  it("일반·비로그인·모르는 값은 false", () => {
    expect(isStaffRole("USER")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole("SUPERUSER")).toBe(false);
  });
});

describe("getAdminPermissions — 알 수 없는 입력은 무권한", () => {
  const noneKeys: (keyof AdminPermissions)[] = [
    "canManageReports",
    "canManageUsers",
    "canApproveSignups",
    "canManageNewFamily",
    "canViewAuditLog",
    "canManageContent",
    "canManageEvents",
    "canManageCalendar",
  ];
  const expectNone = (perms: AdminPermissions) => {
    for (const key of noneKeys) expect(perms[key]).toBe(false);
  };

  it("null·undefined·빈문자열·모르는 역할 → 전부 무권한", () => {
    expectNone(getAdminPermissions(null));
    expectNone(getAdminPermissions(undefined));
    expectNone(getAdminPermissions(""));
    expectNone(getAdminPermissions("SUPERUSER"));
    expectNone(getAdminPermissions("USER"));
  });

  it("프로토타입 체인 키(toString·constructor·hasOwnProperty)도 무권한 — 상속 함수 유출 방지", () => {
    for (const key of ["toString", "constructor", "hasOwnProperty", "__proto__", "valueOf"]) {
      const perms = getAdminPermissions(key);
      // 반환은 항상 실제 AdminPermissions 객체여야 하며(함수·undefined 아님) 전부 false.
      expect(typeof perms).toBe("object");
      expectNone(perms);
    }
  });
});

describe("getAdminPermissions — 역할별 권한 매트릭스(백엔드 SecurityConfig 와 1:1)", () => {
  it("ADMIN 은 전권", () => {
    const p = getAdminPermissions("ADMIN");
    expect(Object.values(p).every(Boolean)).toBe(true);
  });

  it("OPERATOR 는 감사 로그만 제외(로그·역할변경·정지는 ADMIN 전용)", () => {
    const p = getAdminPermissions("OPERATOR");
    expect(p.canViewAuditLog).toBe(false);
    expect(p.canManageReports).toBe(true);
    expect(p.canManageUsers).toBe(true);
    expect(p.canApproveSignups).toBe(true);
    expect(p.canManageNewFamily).toBe(true);
    expect(p.canManageContent).toBe(true);
    expect(p.canManageEvents).toBe(true);
    expect(p.canManageCalendar).toBe(true);
  });

  it("MINISTRY 는 행사 관리만", () => {
    const p = getAdminPermissions("MINISTRY");
    expect(p.canManageEvents).toBe(true);
    expect(p.canManageContent).toBe(false);
    expect(p.canManageNewFamily).toBe(false);
    expect(p.canManageReports).toBe(false);
  });

  it("NEW_FAMILY 는 새가족 관리만", () => {
    const p = getAdminPermissions("NEW_FAMILY");
    expect(p.canManageNewFamily).toBe(true);
    expect(p.canManageEvents).toBe(false);
    expect(p.canManageContent).toBe(false);
  });

  it("CONTENT 는 콘텐츠 관리만(공지·주보·설교·문서 첨부)", () => {
    const p = getAdminPermissions("CONTENT");
    expect(p.canManageContent).toBe(true);
    expect(p.canManageEvents).toBe(false);
    expect(p.canManageReports).toBe(false);
  });
});

// 권한 축별 역-매핑: "이 권한을 가진 역할 집합"이 백엔드 경로 세그먼트와 일치하는지 고정.
describe("권한별 보유 역할 집합", () => {
  const holders = (key: keyof AdminPermissions) =>
    (Object.keys(rolePermissions) as (keyof typeof rolePermissions)[])
      .filter((role) => rolePermissions[role][key])
      .sort();

  it("감사 로그는 ADMIN 만", () => {
    expect(holders("canViewAuditLog")).toEqual(["ADMIN"]);
  });
  it("신고·회원·승인·캘린더는 ADMIN·OPERATOR", () => {
    for (const key of ["canManageReports", "canManageUsers", "canApproveSignups", "canManageCalendar"] as const) {
      expect(holders(key)).toEqual(["ADMIN", "OPERATOR"]);
    }
  });
  it("새가족은 ADMIN·OPERATOR·NEW_FAMILY", () => {
    expect(holders("canManageNewFamily")).toEqual(["ADMIN", "NEW_FAMILY", "OPERATOR"]);
  });
  it("콘텐츠는 ADMIN·OPERATOR·CONTENT", () => {
    expect(holders("canManageContent")).toEqual(["ADMIN", "CONTENT", "OPERATOR"]);
  });
  it("행사는 ADMIN·OPERATOR·MINISTRY", () => {
    expect(holders("canManageEvents")).toEqual(["ADMIN", "MINISTRY", "OPERATOR"]);
  });
});
