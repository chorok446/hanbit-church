// 행사·사역 작성 화면의 유형별 템플릿. static data로만 관리한다.
import { marketPhotos, naturePhotos, peoplePhotos, workshopPhotos } from "@/data/photos";
import type { CampaignComposeValues } from "@/data/campaigns";

export type CampaignTemplate = {
  id: string;
  /** 칩 버튼에 표시되는 이름 */
  label: string;
  /** 적용되는 필드. 일정은 행사별로 달라 채우지 않는다. */
  values: Pick<CampaignComposeValues, "title" | "summary" | "body" | "thumb" | "capacity">;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "retreat",
    label: "⛺ 수련회·성경학교",
    values: {
      title: "여름 수련회",
      summary: "말씀과 기도로 함께하는 수련회에 초대합니다",
      body: `🙏 어떤 모임인가요
(수련회의 주제와 말씀을 적어주세요)

📋 안내
- 장소: (예: ○○ 수양관)
- 대상: (예: 청년부 전체)
- 회비: (예: 1인 ○만원, 계좌 안내)
- 준비물: (예: 성경, 세면도구, 편한 복장)

📞 문의
- (예: 담당 교역자 또는 부서 임원)`,
      thumb: naturePhotos[1],
      capacity: "60",
    },
  },
  {
    id: "volunteer",
    label: "🤝 봉사·섬김",
    values: {
      title: "지역 섬김 봉사",
      summary: "이웃을 섬기는 봉사에 함께해 주세요",
      body: `🙏 어떤 섬김인가요
(봉사의 목적과 섬길 대상을 적어주세요)

📋 안내
- 집결 장소: (예: 교회 본당 앞)
- 활동 내용: (예: 반찬 나눔, 마을 청소)
- 준비물: (예: 편한 복장, 장갑은 교회에서 준비)

💛 참여 후에는
- 참여 후기를 남겨 은혜를 나눠주세요`,
      thumb: peoplePhotos[0],
      capacity: "20",
    },
  },
  {
    id: "class",
    label: "📖 성경공부·양육",
    values: {
      title: "성경공부반 모집",
      summary: "말씀을 깊이 배우는 성경공부반을 시작합니다",
      body: `🙏 어떤 과정인가요
(교재·본문과 과정의 목표를 적어주세요)

📋 안내
- 모임 시간: (예: 매주 화요일 저녁 8시)
- 장소: (예: 교육관 2층)
- 기간: (예: 8주 과정)
- 준비물: (예: 성경, 교재는 교회에서 제공)

📞 신청·문의
- (예: 담당 교역자)`,
      thumb: workshopPhotos[2],
      capacity: "15",
    },
  },
  {
    id: "fellowship",
    label: "🍚 친교·행사",
    values: {
      title: "전교인 친교 모임",
      summary: "함께 먹고 나누며 교제하는 시간입니다",
      body: `🙏 어떤 자리인가요
(모임의 취지를 적어주세요)

📋 안내
- 장소: (예: 교회 마당 / 친교실)
- 준비물: (예: 나눌 음식 한 가지)
- 회비: (예: 없음)

🙌 함께 지켜요
- (예: 뒷정리까지 함께해요)`,
      thumb: marketPhotos[1],
      capacity: "100",
    },
  },
];
