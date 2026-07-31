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

/** 내비 활성 판정 — 데스크톱 링크·모바일 시트가 공유한다(한쪽만 고치면 표시가 어긋난다). */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}
