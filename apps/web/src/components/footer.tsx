import Link from "next/link";
import { CHURCH } from "@/data/church";

export function Footer() {
  return (
    <footer
      className="px-8 py-12 transition-colors"
      style={{ background: "var(--surface-deep)", color: "rgba(255,255,255,0.65)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--accent)" }}>
            {CHURCH.name}
          </p>
          <p className="mt-2 text-[13px] leading-6">
            {CHURCH.address}
            <br />
            {CHURCH.phone} · {CHURCH.email}
          </p>
        </div>
        <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          <Link href="/about" className="hover:text-white">교회소개</Link>
          <Link href="/worship" className="hover:text-white">예배안내</Link>
          <Link href="/welcome" className="hover:text-white">새가족 안내</Link>
          <Link href="/feed" className="hover:text-white">교제</Link>
          <Link href="/campaigns" className="hover:text-white">행사·사역</Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-[11px] tracking-[0.25em] uppercase opacity-60">
        © 2026 {CHURCH.nameEn}
      </p>
    </footer>
  );
}
