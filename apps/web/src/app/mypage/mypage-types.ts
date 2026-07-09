export type MypageTab = "posts" | "events" | "created" | "saved" | "account" | "access" | "reports";

export type MypageTabGroup = {
  label: string;
  tabs: { id: MypageTab; label: string; adminOnly?: boolean }[];
};

export const MYPAGE_TAB_GROUPS: MypageTabGroup[] = [
  {
    label: "활동",
    tabs: [
      { id: "posts", label: "내 게시글" },
      { id: "events", label: "참여 행사" },
      // TODO(권한: 사역 담당자 역할 도입 시 확장) — 행사 개설은 현재 관리자 전용
      { id: "created", label: "개설 행사", adminOnly: true },
      { id: "saved", label: "저장됨" },
    ],
  },
  {
    label: "계정",
    tabs: [
      { id: "account", label: "보안" },
      { id: "access", label: "접속 기록" },
      { id: "reports", label: "신고 내역" },
    ],
  },
];

export const DEFAULT_MYPAGE_TAB: MypageTab = "posts";

/** 역할에 따라 노출할 탭 그룹(관리자 전용 탭 필터링). */
export function visibleTabGroups(isAdmin: boolean): MypageTabGroup[] {
  return MYPAGE_TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => !tab.adminOnly || isAdmin),
  }));
}

export function parseMypageTab(value: string | null): MypageTab {
  if (value === "security") return "account";
  for (const group of MYPAGE_TAB_GROUPS) {
    if (group.tabs.some((tab) => tab.id === value)) return value as MypageTab;
  }
  return DEFAULT_MYPAGE_TAB;
}
