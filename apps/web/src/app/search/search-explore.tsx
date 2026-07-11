"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { StaggerItem } from "@/components/scroll-reveal";
import { SearchHighlight } from "./search-highlight";
import { MENU_SHORTCUTS, RECOMMENDED_QUERIES, type MenuShortcut } from "./search-menu";

/** 추천 검색어 칩 — 클릭 시 해당 검색어로 검색 실행. */
export function RecommendedQueryChips({ onSearch }: { onSearch: (query: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {RECOMMENDED_QUERIES.map((keyword) => (
        <button
          key={keyword}
          type="button"
          onClick={() => onSearch(keyword)}
          className="rounded-full border px-4 py-2 text-[13px] transition-colors hover:border-[var(--accent)] cta-outline"
        >
          <span aria-hidden style={{ color: "var(--accent-strong)" }}>#</span> {keyword}
        </button>
      ))}
    </div>
  );
}

export function MenuShortcutCard({ menu, highlight }: { menu: MenuShortcut; highlight?: string }) {
  return (
    <Link
      href={menu.href}
      className="group flex items-center justify-between gap-3 rounded-2xl border p-5 transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="min-w-0">
        <p
          className="text-[17px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          <SearchHighlight text={menu.label} query={highlight} />
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-6 opacity-65" style={{ color: "var(--foreground)" }}>
          <SearchHighlight text={menu.description} query={highlight} />
        </p>
      </div>
      <ArrowUpRight
        size={18}
        className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        style={{ color: "var(--accent)" }}
        aria-hidden
      />
    </Link>
  );
}

/** 검색어가 없을 때의 탐색 화면 — 추천 검색어 + 자주 찾는 메뉴 바로가기. */
export function SearchExplore({ onSearch }: { onSearch: (query: string) => void }) {
  return (
    <div className="space-y-14">
      <section aria-label="추천 검색어">
        <p className="mb-4 text-center text-[13px] opacity-60" style={{ color: "var(--foreground)" }}>
          추천 검색어
        </p>
        <RecommendedQueryChips onSearch={onSearch} />
      </section>

      <section aria-label="자주 찾는 메뉴">
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--accent-strong)" }}>
            Quick Links
          </p>
          <h2
            className="mt-1 text-[24px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}
          >
            자주 찾는 메뉴
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU_SHORTCUTS.map((menu, i) => (
            <StaggerItem key={menu.href} index={i}>
              <MenuShortcutCard menu={menu} />
            </StaggerItem>
          ))}
        </div>
      </section>
    </div>
  );
}
