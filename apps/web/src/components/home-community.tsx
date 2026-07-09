import Link from "next/link";
import { CalendarHeart, MessagesSquare } from "lucide-react";

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

/** 홈 커뮤니티(교제·행사) 안내 카드. 새가족 환영 배너는 HomeVisit 으로 이동했다. */
export function HomeCommunity() {
  return (
    <section className="px-6 pb-24 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Community
        </p>
        <h2
          className="mb-8 text-[26px] sm:text-[30px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          함께 나누는 교제와 사역
        </h2>
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
      </div>
    </section>
  );
}
