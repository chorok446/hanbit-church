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
  setAdminContentVisibilityBulk,
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
  const [q, setQ] = useState("");
  // 검색은 제출(Enter/버튼) 시점에만 반영 — 입력마다 요청하지 않는다.
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // 숨김 처리 중인 항목: 사유 입력을 행 아래 펼친다.
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  // 일괄 작업 선택(현재 페이지 한정). requestKey 를 함께 저장해 탭·페이지·검색이 바뀌면
  // 자동으로 빈 선택이 된다(effect 초기화 대신 렌더 시점 identity 비교).
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const requestKey = `${type}:${hiddenOnly}:${appliedQ}:${page}:${retryTick}`;
  const selected = selection.key === requestKey ? selection.ids : new Set<string>();
  const setSelected = (ids: Set<string>) => setSelection({ key: requestKey, ids });

  useEffect(() => {
    let cancelled = false;
    fetchAdminContentPage({ type, hiddenOnly, page, size: PAGE_SIZE, q: appliedQ })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [type, hiddenOnly, appliedQ, page, retryTick, requestKey]);

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

  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const applyBulk = async (hidden: boolean) => {
    if (bulkSaving || selected.size === 0) return;
    const items = (result?.data?.content ?? [])
      .filter((item) => selected.has(item.id))
      .map((item) => ({ targetType: item.targetType, targetId: item.id }));
    if (items.length === 0) return;
    setBulkSaving(true);
    try {
      const res = await setAdminContentVisibilityBulk(items, {
        hidden,
        reason: hidden ? bulkReason.trim() || undefined : undefined,
      });
      toast.success(
        `${res.processed}건을 ${hidden ? "숨김" : "복구"} 처리했습니다.` +
          (res.missing.length > 0 ? ` (${res.missing.length}건은 찾지 못해 건너뜀)` : ""),
      );
      setSelected(new Set());
      setBulkReason("");
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("일괄 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBulkSaving(false);
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
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedQ(q.trim());
              setPage(0);
            }}
          >
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={type === "POST" ? "본문·작성자 검색" : "제목·작성자 검색"}
              aria-label="콘텐츠 검색"
              className="ui-control w-52 placeholder:opacity-50"
              style={controlStyle}
            />
            <button
              type="submit"
              className="rounded-full border px-4 py-2 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              검색
            </button>
          </form>
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
          <div
            className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
              <input
                type="checkbox"
                aria-label="현재 페이지 전체 선택"
                checked={selected.size > 0 && selected.size === result.data.content.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(result.data!.content.map((i) => i.id)) : new Set())
                }
              />
              전체 선택
            </label>
            <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {selected.size}건 선택됨
            </span>
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              maxLength={500}
              placeholder="일괄 숨김 사유 (선택)"
              aria-label="일괄 숨김 사유"
              className="ui-control min-w-40 flex-1 placeholder:opacity-50"
              style={controlStyle}
            />
            <button
              type="button"
              onClick={() => void applyBulk(true)}
              disabled={bulkSaving || selected.size === 0}
              className="cta-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] disabled:opacity-45"
            >
              {bulkSaving ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <EyeOff size={13} aria-hidden />}
              선택 숨김
            </button>
            <button
              type="button"
              onClick={() => void applyBulk(false)}
              disabled={bulkSaving || selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-45"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Eye size={13} aria-hidden />
              선택 복구
            </button>
          </div>
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
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`${item.title} 선택`}
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        className="mt-1"
                      />
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
                        className="cta-danger rounded-full px-4 py-2 text-[13px] disabled:opacity-50"
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
