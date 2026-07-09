/**
 * 교회 기본 정보. 실제 인적사항(담임목사·주소·전화·이메일)은 리포에 커밋하지 않고
 * apps/web/.env.local 의 NEXT_PUBLIC_CHURCH_* 로 관리한다 — 키 목록은 .env.example 참고.
 * env 미설정 시 아래 자리표시 값으로 렌더링된다.
 */
export const CHURCH = {
  name: process.env.NEXT_PUBLIC_CHURCH_NAME ?? "철마제일교회",
  nameEn: process.env.NEXT_PUBLIC_CHURCH_NAME_EN ?? "CHEOLMA JEIL CHURCH",
  pastor: process.env.NEXT_PUBLIC_CHURCH_PASTOR ?? "",
  address: process.env.NEXT_PUBLIC_CHURCH_ADDRESS ?? "부산광역시 기장군 철마면",
  phone: process.env.NEXT_PUBLIC_CHURCH_PHONE ?? "051-000-0000",
  email: process.env.NEXT_PUBLIC_CHURCH_EMAIL ?? "cheolmajeil@church.kr",
} as const;

/** SNS·채널 링크. env 미설정(빈 값)이면 푸터에서 해당 아이콘을 숨긴다. */
export const CHURCH_LINKS = {
  youtube: process.env.NEXT_PUBLIC_CHURCH_YOUTUBE ?? "",
  instagram: process.env.NEXT_PUBLIC_CHURCH_INSTAGRAM ?? "",
  kakao: process.env.NEXT_PUBLIC_CHURCH_KAKAO ?? "",
} as const;

export type WorshipService = {
  name: string;
  time: string;
  place: string;
  note?: string;
  /** 예배 성격 한 줄 소개 (예배안내 상세에서만 노출) */
  description?: string;
  /** 참석 대상 (예: 전교인, 누구나) */
  audience?: string;
  /** 예상 예배 시간 (예: 약 70분) */
  duration?: string;
};

// TODO(교회 확인): 예배 설명·대상·예상 시간은 예시 값 — 교회 확인 후 확정.
export const WORSHIP_SERVICES: WorshipService[] = [
  {
    name: "주일 1부 예배",
    time: "주일 오전 11:00",
    place: "본당",
    description: "말씀과 찬양으로 함께 드리는 주일의 중심 예배입니다.",
    audience: "전교인",
    duration: "약 70분",
  },
  {
    name: "주일 2부 예배",
    time: "주일 오후 2:00",
    place: "본당",
    description: "오전 참석이 어려운 분들을 위해 오후에 드리는 예배입니다.",
    audience: "전교인",
    duration: "약 60분",
  },
  {
    name: "수요 예배",
    time: "수요일 저녁 8:30",
    place: "본당",
    description: "한 주의 중심에서 말씀을 깊이 묵상하는 주중 예배입니다.",
    audience: "누구나",
    duration: "약 60분",
  },
  {
    name: "새벽 기도회",
    time: "매일 오전 6:00",
    place: "본당",
    description: "하루를 말씀과 기도로 시작하는 새벽 기도회입니다.",
    audience: "누구나",
    duration: "약 40분",
  },
];

export type MonthlyVerse = {
  text: string;
  ref: string;
};

/** 홈 히어로 월별 말씀. index = 월-1. 절기에 맞춰 교체·보완한다. */
export const MONTHLY_VERSES: MonthlyVerse[] = [
  { text: "보라 내가 새 일을 행하리니 이제 나타낼 것이라", ref: "이사야 43:19" },
  { text: "너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라", ref: "잠언 3:5" },
  { text: "우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로", ref: "로마서 5:8" },
  { text: "그는 여기 계시지 않고 그가 말씀하시던 대로 살아나셨느니라", ref: "마태복음 28:6" },
  { text: "네 부모를 공경하라 그리하면 네 생명이 길리라", ref: "출애굽기 20:12" },
  { text: "너희는 먼저 그의 나라와 그의 의를 구하라", ref: "마태복음 6:33" },
  { text: "항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라", ref: "데살로니가전서 5:16–18" },
  { text: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라", ref: "마태복음 11:28" },
  { text: "여호와는 나의 목자시니 내게 부족함이 없으리로다", ref: "시편 23:1" },
  { text: "범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라", ref: "데살로니가전서 5:18" },
  { text: "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라", ref: "빌립보서 4:13" },
  { text: "말씀이 육신이 되어 우리 가운데 거하시매 우리가 그의 영광을 보니", ref: "요한복음 1:14" },
];

export function verseOfMonth(date: Date = new Date()): MonthlyVerse {
  return MONTHLY_VERSES[date.getMonth()];
}
