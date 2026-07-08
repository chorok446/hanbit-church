import Link from "next/link";
import { CalendarHeart, MessagesSquare } from "lucide-react";
import { CHURCH } from "@/data/church";

const CARDS = [
  {
    href: "/feed",
    icon: MessagesSquare,
    title: "성도의 교제",
    body: "삶의 나눔과 기도 제목을 함께 나누는 공간입니다. 댓글과 멘션으로 서로를 격려해 주세요.",
    cta: "교제 공간 가기",
  },
  {
    href: "/campaigns",
    icon: CalendarHeart,
    title: "행사·사역",
    body: "수련회, 봉사, 부서 행사에 온라인으로 신청하고 참여 후기를 남길 수 있습니다.",
    cta: "행사 둘러보기",
  },
] as const;

/** 홈 커뮤니티 안내 + 새가족 초대 배너. */
export function HomeCommunity() {
  return (
    <section className="px-6 pb-24 pt-4 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CARDS.map(({ href, icon: Icon, title, body, cta }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-3xl border p-8 transition-transform hover:-translate-y-1 motion-reduce:transform-none"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <Icon size={22} aria-hidden style={{ color: "var(--accent)" }} />
              <h3
                className="mt-4 text-[20px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {title}
              </h3>
              <p className="mt-2 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
                {body}
              </p>
              <span className="mt-4 inline-block text-[13px] font-medium underline-offset-4 group-hover:underline" style={{ color: "var(--accent-strong)" }}>
                {cta} →
              </span>
            </Link>
          ))}
        </div>

        <div
          className="mt-12 rounded-3xl px-8 py-14 text-center sm:px-14"
          style={{ background: "var(--surface-deep)" }}
        >
          <p
            className="mx-auto max-w-[26ch] text-[22px] leading-[1.6] text-[#f6f3ea] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, textWrap: "balance" }}
          >
            {CHURCH.name}에 처음 오셨나요?
            <br />
            한 분 한 분을 기쁨으로 환영합니다.
          </p>
          <Link
            href="/welcome"
            className="mt-8 inline-block rounded-full border px-8 py-3.5 text-[14px] font-medium text-[#f6f3ea] transition-colors hover:bg-white/10"
            style={{ borderColor: "rgba(212, 176, 74, 0.6)" }}
          >
            새가족 안내 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
