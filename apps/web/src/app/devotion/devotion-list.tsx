"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StaggerItem } from "@/components/scroll-reveal";
import {
  DEVOTION_PAGE_SIZE,
  devotionListPath,
  devotionShortDate,
  type DevotionPageResponse,
  type DevotionSummary,
} from "@/data/devotion";

type Result = { key: string; status: "success" | "error"; data: DevotionPageResponse | null };

function DevotionRow({ item, index }: { item: DevotionSummary; index: number }) {
  return (
    <li className="border-b" style={{ borderColor: "var(--border)" }}>
      <StaggerItem index={index}>
        <Link href={`/devotion/${item.id}`} className="group block py-7">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
            <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent-strong)" }}>
              {devotionShortDate(item.date)}
            </span>
            <span aria-hidden>·</span>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>{item.verseRef}</span>
          </div>
          <p
            className="mt-2 text-[19px] leading-snug"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)", wordBreak: "keep-all" }}
          >
            “{item.verseText}”
          </p>
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
            {item.excerpt}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--accent-strong)" }}
            >
              묵상 보기 <ArrowRight size={13} aria-hidden />
            </span>
            {item.comments > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--foreground-muted)" }}>
                <MessageCircle size={12} aria-hidden /> {item.comments}
              </span>
            ) : null}
          </div>
        </Link>
      </StaggerItem>
    </li>
  );
}

/**
 * 큐티 목록 — 발행분(오늘 이하)만 최신 날짜순 페이지. /devotion 전용.
 * initialData: 서버(ISR)가 선주입한 첫 페이지(중복 fetch 가드).
 */
export function DevotionList({ initialData = null }: { initialData?: DevotionPageResponse | null }) {
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(
    initialData ? { key: "0:0", status: "success", data: initialData } : null,
  );

  const requestKey = `${page}:${retryTick}`;

  useEffect(() => {
    if (result?.key === requestKey) return;
    let cancelled = false;
    apiGet<DevotionPageResponse>(devotionListPath(page, DEVOTION_PAGE_SIZE))
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryTick, requestKey, result]);

  const loading = result === null || result.key !== requestKey;

  if (loading) {
    return (
      <p role="status" className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
        불러오는 중입니다…
      </p>
    );
  }
  if (result.status === "error" || !result.data) {
    return (
      <div role="alert" className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
        목록을 불러오지 못했습니다.{" "}
        <button type="button" onClick={() => setRetryTick((t) => t + 1)} className="underline" style={{ color: "var(--foreground)" }}>
          다시 시도
        </button>
      </div>
    );
  }
  if (result.data.content.length === 0) {
    return <ListEmptyState title="등록된 묵상이 없습니다." description="곧 오늘의 말씀을 나눠 드리겠습니다." />;
  }

  return (
    <>
      <ul className="border-t" style={{ borderColor: "var(--border)" }}>
        {result.data.content.map((item, index) => (
          <DevotionRow key={item.id} item={item} index={index} />
        ))}
      </ul>
      {result.data.totalPages > 1 ? (
        <div className="mt-8">
          <Pagination page={page} totalPages={result.data.totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </>
  );
}
