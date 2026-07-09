/** 검색 탐색 화면·"바로가기" 섹션에서 쓰는 주요 메뉴 목록. 전부 실존 라우트. */
export type MenuShortcut = {
  href: string;
  label: string;
  description: string;
  /** 검색어 매칭용 보조 키워드(라벨·설명 외). */
  keywords: string[];
};

export const MENU_SHORTCUTS: MenuShortcut[] = [
  {
    href: "/about",
    label: "교회소개",
    description: "한빛교회의 소개와 섬기는 분들",
    keywords: ["교회", "소개", "비전", "역사"],
  },
  {
    href: "/worship",
    label: "예배안내",
    description: "주일·수요·새벽 예배 시간과 장소 안내",
    keywords: ["예배", "주일", "수요", "새벽", "시간"],
  },
  {
    href: "/welcome",
    label: "새가족",
    description: "처음 오신 분을 위한 새가족 등록 안내",
    keywords: ["새가족", "등록", "환영", "처음", "방문"],
  },
  {
    href: "/sermons",
    label: "설교",
    description: "주일 설교 말씀 다시 보기",
    keywords: ["설교", "말씀", "영상", "다시보기"],
  },
  {
    href: "/news",
    label: "소식",
    description: "교회 공지사항과 주보",
    keywords: ["소식", "공지", "주보", "알림"],
  },
  {
    href: "/feed",
    label: "교제",
    description: "성도들의 나눔과 기도요청",
    keywords: ["교제", "나눔", "기도", "기도요청"],
  },
  {
    href: "/campaigns",
    label: "행사·사역",
    description: "교회 행사와 사역 참여 안내",
    keywords: ["행사", "사역", "수련회", "봉사", "참여"],
  },
];

/** 탐색 화면·빈 결과에서 보여주는 추천 검색어. */
export const RECOMMENDED_QUERIES = ["예배", "새가족", "청년", "수련회", "주보", "기도요청"];

/** 검색어가 메뉴명·설명·키워드에 걸리면 바로가기 후보로 반환. 대소문자 무시. */
export function matchMenuShortcuts(query: string): MenuShortcut[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  return MENU_SHORTCUTS.filter(
    (menu) =>
      menu.label.toLowerCase().includes(keyword)
      || menu.description.toLowerCase().includes(keyword)
      || menu.keywords.some((k) => k.includes(keyword) || keyword.includes(k)),
  );
}
