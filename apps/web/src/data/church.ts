/** 교회 기본 정보. 실제 값 확정 전 자리표시 — 교회 확인 후 이 파일만 고치면 된다. */
export const CHURCH = {
  name: "철마제일교회",
  nameEn: "CHEOLMA JEIL CHURCH",
  // TODO(교회 확인): 실제 주소·연락처로 교체
  address: "부산광역시 기장군 철마면 (상세 주소 확인 중)",
  phone: "051-000-0000",
  email: "cheolmajeil@church.kr",
} as const;

export type WorshipService = {
  name: string;
  time: string;
  place: string;
  note?: string;
};

// TODO(교회 확인): 실제 예배 시간표로 교체
export const WORSHIP_SERVICES: WorshipService[] = [
  { name: "주일 1부 예배", time: "주일 오전 9:00", place: "본당" },
  { name: "주일 2부 예배", time: "주일 오전 11:00", place: "본당" },
  { name: "수요 예배", time: "수요일 저녁 7:30", place: "본당" },
  { name: "새벽 기도회", time: "매일 오전 5:30", place: "본당" },
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
