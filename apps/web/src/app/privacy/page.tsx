import type { Metadata } from "next";
import { CHURCH } from "@/data/church";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${CHURCH.name} 개인정보처리방침 — 수집 항목, 이용 목적, 보유 기간 안내`,
};

// TODO(교회 확인): 시행일·책임자 성명/연락처는 교회 확정 후 갱신한다. 항목·보유기간은 실제
// 서비스 동작(회원가입 users, 새가족 신청 new_family, 접속기록 user_access_logs 365일)과 맞춰 두었다.
const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "1. 수집하는 개인정보 항목",
    body: [
      "회원가입: 이메일, 이름, 비밀번호(암호화 저장)",
      "새가족 등록 신청: 이름, 연락처, 방문 희망일, 남기고 싶은 말(선택)",
      "서비스 이용 과정에서 자동 수집: 접속 IP, 브라우저·운영체제 정보, 접속 일시",
    ],
  },
  {
    title: "2. 개인정보의 이용 목적",
    body: [
      "회원 관리: 가입 승인, 본인 확인, 커뮤니티 이용(교제·행사 참여·댓글 등)",
      "새가족 안내: 방문 안내 연락, 정착 도움",
      "보안: 비정상 접근 확인을 위한 접속 기록 관리",
    ],
  },
  {
    title: "3. 보유 및 이용 기간",
    body: [
      "회원 정보: 회원 탈퇴 시 지체 없이 삭제 (탈퇴 시 작성 게시물의 작성자 표시는 익명 처리)",
      "새가족 신청 정보: 안내 완료 후 내부 방침에 따라 파기",
      "접속 기록: 수집일로부터 365일 보관 후 자동 삭제",
    ],
  },
  {
    title: "4. 제3자 제공 및 처리 위탁",
    body: [
      "수집된 개인정보는 외부에 제공하거나 처리를 위탁하지 않습니다.",
      "법령에 근거한 요청이 있는 경우에만 예외로 합니다.",
    ],
  },
  {
    title: "5. 정보주체의 권리",
    body: [
      "언제든지 마이페이지에서 본인 정보의 열람·수정·삭제(회원 탈퇴)를 할 수 있습니다.",
      "새가족 신청 정보의 열람·정정·삭제는 아래 연락처로 요청할 수 있습니다.",
    ],
  },
  {
    title: "6. 개인정보 보호책임자",
    body: [
      `문의: ${CHURCH.phone} / ${CHURCH.email}`,
      "개인정보 처리에 관한 문의·불만·피해구제 요청을 접수해 처리합니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Privacy Policy
        </p>
        <h1
          className="mt-2 text-[30px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          개인정보처리방침
        </h1>
        <p className="mt-4 text-[14.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          {CHURCH.name}(이하 &ldquo;교회&rdquo;)는 개인정보 보호법에 따라 교인과 방문자의 개인정보를 보호하고,
          관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 둡니다.
        </p>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title} className="border-t pt-6" style={{ borderColor: "rgba(var(--ink-rgb), 0.25)" }}>
              <h2
                className="text-[19px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {section.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {section.body.map((line) => (
                  <li key={line} className="text-[14px] leading-[26px]" style={{ color: "var(--foreground-muted)" }}>
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-12 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          본 방침은 게시한 날부터 적용됩니다. 내용이 바뀌면 이 페이지에서 갱신해 안내합니다.
        </p>
      </div>
    </section>
  );
}
