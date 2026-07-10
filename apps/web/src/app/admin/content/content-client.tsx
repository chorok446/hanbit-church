"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import {
  fetchAdminContentPage,
  setAdminContentVisibility,
  type AdminContentItem,
  type AdminContentPageResponse,
} from "@/data/admin";
import { postCategoryLabel, type PostCategory } from "@/data/posts";

const PAGE_SIZE = 20;

const EVENT_STATUS_LABELS: Record<string, string> = { upcoming: "모집예정", open: "모집중", closed: "모집마감" };

type Result = { key: string; status: "success" | "error"; data: AdminContentPageResponse | null };

/** 게시글·행사 숨김/복구 관리. 공개 목록과 달리 숨김 콘텐츠도 함께 보인다. */
export default function AdminContentClient() {
  const [type, setType] = useState<"POST" | "EVENT">("POST");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // 숨김 처리 중인 항목: 사유 입력을 행 아래 펼친다.
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const requestKey = `${type}:${hiddenOnly}:${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchAdminContentPage({ type, hiddenOnly, page, size: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [type, hiddenOnly, page, retryTick, requestKey]);

  const applyVisibility = async (item: AdminContentItem, hidden: boolean, reason?: string) => {
    if (savingId) return;
    setSavingId(item.id);
    try {
      await setAdminContentVisibility(item.targetType, item.id, { hidden, reason: reason?.trim() || undefined });
      setHidingId(null);
      setHideReason("");
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingId(null);
    }
  };

  const loading = result === null || result.key !== requestKey;
  const controlStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="콘텐츠 종류">
          {(
            [
              { value: "POST", label: "게시글" },
              { value: "EVENT", label: "행사" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={type === tab.value}
              onClick={() => {
                setType(tab.value);
                setPage(0);
                setHidingId(null);
              }}
              className="rounded-full border px-4 py-2 text-[13px]"
              style={
                type === tab.value
                  ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                  : { borderColor: "var(--border)", color: "var(--foreground)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
          <input
            type="checkbox"
            checked={hiddenOnly}
            onChange={(e) => {
              setHiddenOnly(e.target.checked);
              setPage(0);
            }}
          />
          숨김만 보기
        </label>
      </div>

      {loading ? (
        <StatePanel compact>
          <Loader2 className="animate-spin" size={20} aria-hidden />
          <p>콘텐츠를 불러오는 중입니다…</p>
        </StatePanel>
      ) : result.status === "error" || !result.data ? (
        <StatePanel compact>
          <p>목록을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            다시 시도
          </button>
        </StatePanel>
      ) : result.data.content.length === 0 ? (
        <StatePanel compact>
          <p>{hiddenOnly ? "숨김 처리된 콘텐츠가 없습니다." : "콘텐츠가 없습니다."}</p>
        </StatePanel>
      ) : (
        <>
          <ul className="space-y-3">
            {result.data.content.map((item) => {
              const href = item.targetType === "POST" ? `/posts/${item.id}` : `/events/${item.id}`;
              const categoryLabel =
                item.targetType === "POST"
                  ? postCategoryLabel((item.category ?? "SHARING") as PostCategory)
                  : (EVENT_STATUS_LABELS[item.category ?? ""] ?? item.category);
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border p-5"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                        >
                          {categoryLabel}
                        </span>
                        {item.hidden ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                          >
                            숨김
                          </span>
                        ) : null}
                        {item.deleted ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                          >
                            작성자 삭제
                          </span>
                        ) : null}
                        <span className="break-all text-[14.5px] font-semibold" style={{ color: "var(--heading)" }}>
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
                        {item.authorName}
                        {item.hidden && item.hiddenReason ? ` · 숨김 사유: ${item.hiddenReason}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={href}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px]"
                        style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
                      >
                        <ExternalLink size={12} aria-hidden /> 보기
                      </Link>
                      {item.hidden ? (
                        <button
                          type="button"
                          onClick={() => void applyVisibility(item, false)}
                          disabled={savingId !== null}
                          aria-busy={savingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                          {savingId === item.id ? (
                            <Loader2 size={13} className="animate-spin" aria-hidden />
                          ) : (
                            <Eye size={13} aria-hidden />
                          )}
                          복구
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setHidingId(hidingId === item.id ? null : item.id);
                            setHideReason("");
                          }}
                          disabled={savingId !== null || item.deleted}
                          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
                          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                        >
                          <EyeOff size={13} aria-hidden /> 숨김
                        </button>
                      )}
                    </div>
                  </div>
                  {hidingId === item.id ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                      <input
                        type="text"
                        value={hideReason}
                        maxLength={200}
                        onChange={(e) => setHideReason(e.target.value)}
                        placeholder="숨김 사유 (선택 — 작성자 알림에 포함)"
                        className="ui-control min-w-0 flex-1 placeholder:opacity-50"
                        style={controlStyle}
                      />
                      <button
                        type="button"
                        onClick={() => void applyVisibility(item, true, hideReason)}
                        disabled={savingId !== null}
                        aria-busy={savingId === item.id}
                        className="rounded-full px-4 py-2 text-[13px] disabled:opacity-50"
                        style={{ background: "var(--danger)", color: "#fff" }}
                      >
                        숨김 확정
                      </button>
                      <button
                        type="button"
                        onClick={() => setHidingId(null)}
                        className="rounded-full border px-4 py-2 text-[13px]"
                        style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
                      >
                        취소
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {result.data.totalPages > 1 ? (
            <Pagination page={page} totalPages={result.data.totalPages} onPageChange={setPage} />
          ) : null}
        </>
      )}
    </div>
  );
}
