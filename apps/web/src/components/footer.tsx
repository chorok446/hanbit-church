import Link from "next/link";
import { CHURCH, CHURCH_LINKS, WORSHIP_SERVICES } from "@/data/church";

const QUICK_LINKS = [
  { href: "/about", label: "교회소개" },
  { href: "/worship", label: "예배안내" },
  { href: "/welcome", label: "새가족 안내" },
  { href: "/sermons", label: "설교" },
  { href: "/news", label: "소식" },
  { href: "/feed", label: "교제" },
  { href: "/prayer", label: "기도벽" },
  { href: "/events", label: "행사·사역" },
  { href: "/giving", label: "헌금 안내" },
];

/* 브랜드 아이콘 — 설치된 lucide-react 버전에는 브랜드 아이콘이 없어 인라인 SVG 로 그린다(선 스타일은 lucide 규격). */
function BrandIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const YOUTUBE_ICON = (
  <BrandIcon>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </BrandIcon>
);

const INSTAGRAM_ICON = (
  <BrandIcon>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </BrandIcon>
);

const KAKAO_ICON = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.25 4.65 6.65l-.95 3.53c-.08.31.27.56.54.38l4.19-2.78c.51.06 1.03.1 1.57.1 5.52 0 10-3.53 10-7.88C22 6.54 17.52 3 12 3Z" />
  </svg>
);

const CHANNELS = [
  { href: CHURCH_LINKS.youtube, label: "유튜브", icon: YOUTUBE_ICON },
  { href: CHURCH_LINKS.instagram, label: "인스타그램", icon: INSTAGRAM_ICON },
  { href: CHURCH_LINKS.kakao, label: "카카오 채널", icon: KAKAO_ICON },
].filter((channel) => channel.href !== "");

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium tracking-[0.25em] uppercase" style={{ color: "var(--accent)" }}>
      {children}
    </p>
  );
}

export function Footer() {
  return (
    <footer
      className="px-8 py-12 transition-colors"
      style={{ background: "var(--footer-bg)", color: "rgba(255,255,255,0.65)" }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* ① 교회명 + 주소 + 연락처 */}
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--accent)" }}>
            {CHURCH.name}
          </p>
          <p className="mt-3 text-[13px] leading-6">
            {CHURCH.address}
            <br />
            {CHURCH.phoneTel ? (
              <a href={`tel:${CHURCH.phoneTel}`} className="underline-offset-4 hover:underline">
                {CHURCH.phone}
              </a>
            ) : (
              CHURCH.phone
            )}
            {CHURCH.email ? (
              <>
                <br />
                {CHURCH.email}
              </>
            ) : null}
          </p>
        </div>

        {/* ② 예배시간 요약 */}
        <div>
          <ColumnTitle>예배시간</ColumnTitle>
          <ul className="mt-3 space-y-2 text-[13px]">
            {WORSHIP_SERVICES.map((service) => (
              <li key={service.name} className="flex flex-wrap gap-x-2">
                <span className="text-white/80">{service.name}</span>
                <span>{service.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ③ 바로가기 */}
        <nav aria-label="푸터 메뉴">
          <ColumnTitle>바로가기</ColumnTitle>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ④ 채널 — env 미설정 링크는 숨김 */}
        {CHANNELS.length > 0 && (
          <div>
            <ColumnTitle>채널</ColumnTitle>
            <div className="mt-3 flex gap-3">
              {CHANNELS.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={channel.label}
                  title={channel.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {channel.icon}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* lg:pr-24 — 우하단 고정 위젯(테마 토글·위로가기)이 개인정보처리방침 링크를 덮지 않도록 확보하는 여백. */}
      <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 lg:pr-24">
        <p className="text-[11px] tracking-[0.25em] uppercase opacity-80">© 2026 {CHURCH.nameEn}</p>
        <p className="flex gap-4 text-[12px]">
          <Link href="/privacy" className="font-medium opacity-85 transition-opacity hover:opacity-100">
            개인정보처리방침
          </Link>
        </p>
      </div>
    </footer>
  );
}
