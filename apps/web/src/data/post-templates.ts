// 글 작성 화면의 유형별 예시. static data로만 관리한다.
// 서버 카테고리(PostCategory)와 1:1로 대응한다. 이미지/행사 연결은 사용자 고유 값이라 채우지 않는다.
import type { PostCategory, PostComposeValues } from "@/data/posts";

export type PostTemplate = {
  id: string;
  /** 칩 버튼에 표시되는 이름 */
  label: string;
  /** 적용 시 함께 선택되는 카테고리 */
  category: PostCategory;
  values: Pick<PostComposeValues, "text" | "tags">;
};

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "sharing",
    label: "💛 은혜 나눔",
    category: "SHARING",
    values: {
      text: `이번 주에 받은 은혜를 나눕니다.

(예배·말씀·일상에서 경험한 감사한 일을 적어주세요)

함께 기뻐해 주세요 🙏`,
      tags: ["나눔"],
    },
  },
  {
    id: "prayer",
    label: "🙏 기도 요청",
    category: "PRAYER",
    values: {
      text: `기도 부탁드립니다.

(기도가 필요한 상황을 편하게 적어주세요)

함께 기도해 주시면 큰 힘이 됩니다.`,
      tags: ["기도요청"],
    },
  },
  {
    id: "notice",
    label: "📢 공지",
    category: "NOTICE",
    values: {
      text: `[공지] (제목을 적어주세요)

- 일시: (예: 7월 20일 주일 오후 1시)
- 장소: (예: 본당)
- 대상: (예: 전 교인)

문의: (담당자)`,
      tags: ["공지"],
    },
  },
  {
    id: "sermon",
    label: "📖 설교 나눔",
    category: "SERMON",
    values: {
      text: `주일 설교 — "(설교 제목)" ((본문 말씀))

다시듣기: (유튜브 링크를 붙여넣으면 영상이 함께 표시됩니다)

(말씀 요약과 나눔 질문을 적어주세요)`,
      tags: ["설교", "주일예배"],
    },
  },
];
