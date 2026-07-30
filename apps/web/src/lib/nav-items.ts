export type NavItem = { label: string; href: string };

/** 내비 그룹 — 방문자 여정 순(방문 검토 → 말씀·소식 → 교인 활동). 시트 소제목·데스크톱 구분자가 공유한다. */
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "방문 안내",
    items: [
      { label: "교회소개", href: "/about" },
      { label: "예배안내", href: "/worship" },
      { label: "새가족", href: "/welcome" },
    ],
  },
  {
    title: "말씀과 소식",
    items: [
      { label: "설교", href: "/sermons" },
      { label: "묵상", href: "/devotion" },
      { label: "주보", href: "/bulletin" },
      { label: "소식", href: "/news" },
    ],
  },
  {
    title: "교제와 사역",
    items: [
      { label: "교제", href: "/feed" },
      { label: "기도벽", href: "/prayer" },
      { label: "행사·사역", href: "/events" },
    ],
  },
];

export const HOME_NAV_ITEM: NavItem = { label: "홈", href: "/" };

/** 평면 목록이 필요한 소비자(활성 판정 등)용 — 그룹 순서를 그대로 편다. */
export const MAIN_NAV_ITEMS: NavItem[] = [HOME_NAV_ITEM, ...NAV_GROUPS.flatMap((g) => g.items)];
