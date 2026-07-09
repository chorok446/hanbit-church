"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Phone, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { maskPhone } from "@/lib/mask";
import {
  fetchNewFamilyPage,
  setNewFamilyContacted,
  type NewFamilyItem,
  type NewFamilyPageResponse,
} from "@/data/new-family";

const PAGE_SIZE = 20;

type Result = { key: string; status: "success" | "error"; data: NewFamilyPageResponse | null };

export default function NewFamilyClient() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const requestKey = `${pendingOnly}:${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    fetchNewFamilyPage({ pendingOnly, page, size: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [pendingOnly, page, retryTick, requestKey]);

  const toggleContacted = async (item: NewFamilyItem) => {
    if (savingId) return;
    setSavingId(item.id);
    try {
      await setNewFamilyContacted(item.id, item.contactedAt === null);
      setRetryTick((t) => t + 1);
    } catch {
      toast.error("처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingId(null);
    }
  };

  const loading = result === null || result.key !== requestKey;

  if (loading) {
    return (
      <StatePanel compact>
        <Loader2 className="animate-spin" size={20} aria-hidden />
        <p>새가족 신청을 불러오는 중입니다…</p>
      </StatePanel>
    );
  }

  if (result.status === "error" || !result.data) {
    return (
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
    );
  }

  const { data } = result;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          아직 연락하지 않은 신청 <b style={{ color: "var(--foreground)" }}>{data.pendingCount.toLocaleString()}건</b>
        </p>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--foreground)" }}>
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => {
              setPendingOnly(e.target.checked);
              setPage(0);
            }}
          />
          미연락만 보기
        </label>
      </div>

      {data.content.length === 0 ? (
        <StatePanel compact>
          <p>{pendingOnly ? "연락할 신청이 없습니다." : "아직 등록 신청이 없습니다."}</p>
        </StatePanel>
      ) : (
        <ul className="space-y-3">
          {data.content.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
                    {item.name}
                  </span>
                  <PhonePrivacy name={item.name} phone={item.phone} />
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={
                      item.contactedAt
                        ? { background: "var(--chip-bg)", color: "var(--foreground-muted)" }
                        : { background: "var(--accent-soft)", color: "var(--accent-strong)" }
                    }
                  >
                    {item.contactedAt ? "연락 완료" : "대기"}
                  </span>
                </div>
                {item.note ? (
                  <p className="mt-1.5 break-words text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
                    {item.note}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  {new Date(item.createdAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })} 신청
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleContacted(item)}
                disabled={savingId !== null}
                aria-busy={savingId === item.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
                style={
                  item.contactedAt
                    ? { borderColor: "var(--border)", color: "var(--foreground-muted)", background: "transparent" }
                    : { borderColor: "var(--cta-bg)", color: "var(--cta-fg)", background: "var(--cta-bg)" }
                }
              >
                {savingId === item.id ? (
                  <Loader2 size={13} className="animate-spin" aria-hidden />
                ) : item.contactedAt ? (
                  <Undo2 size={13} aria-hidden />
                ) : (
                  <Check size={13} aria-hidden />
                )}
                {item.contactedAt ? "대기로 되돌리기" : "연락 완료"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 ? (
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

/**
 * 연락처 개인정보 보호: 목록 기본 표시는 끝 4자리 마스킹(010-1234-****).
 * 관리자는 새가족 연락이 업무라 전화 걸기(tel: 링크에는 원본 번호)와
 * "전체 보기" 토글은 그대로 둔다 — 화면 노출만 줄이는 표시용 마스킹이다.
 */
function PhonePrivacy({ name, phone }: { name: string; phone: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <a
        href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
        className="inline-flex items-center gap-1 py-1 text-[13px] underline-offset-4 hover:underline"
        style={{ color: "var(--accent-strong)" }}
        aria-label={`${name}님에게 전화 걸기`}
      >
        <Phone size={12} aria-hidden /> {revealed ? phone : maskPhone(phone)}
      </a>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-pressed={revealed}
        aria-label={revealed ? "전화번호 가리기" : "전화번호 전체 보기"}
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]"
        style={{ borderColor: "var(--border)", color: "var(--foreground-muted)", background: "transparent" }}
      >
        {revealed ? <EyeOff size={11} aria-hidden /> : <Eye size={11} aria-hidden />}
        {revealed ? "가리기" : "전체 보기"}
      </button>
    </span>
  );
}
