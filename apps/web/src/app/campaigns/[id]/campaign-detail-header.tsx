"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Flag, Link2, MoreHorizontal, Pencil, Trash2, Users, Bookmark } from "lucide-react";
import { progressPercent } from "@/lib/progress";
import { campaignLifecycle, campaignProgressLabel, type Campaign } from "@/data/campaigns";
import { Avatar } from "@/components/avatar";
import { ReportButton, type ReportButtonHandle } from "@/components/report-button";
import { AdminModerationButton } from "@/components/admin-moderation-button";
import { CampaignThumb } from "../campaign-thumb";

function StatusBadge({ c }: { c: Campaign }) {
  const badge = campaignLifecycle(c).badge;
  return (
    <span
      className="text-[11px] tracking-[0.2em] px-3 py-1.5 rounded-full inline-block"
      style={{ background: badge.color, color: badge.fg }}
    >
      {badge.label}
    </span>
  );
}

/** posts 상세의 PostActionsMenu 패턴 — 링크 복사·신고를 ⋯ 메뉴로 묶어 상단 액션 위계를 낮춘다. */
function CampaignActionsMenu({ campaignId, canReport }: { campaignId: string; canReport: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<ReportButtonHandle>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const copyLink = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(location.href);
      toast.success("링크를 복사했어요.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const menuItemClass =
    "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)]";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="행사 메뉴"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(var(--ink-rgb),0.06)]"
        style={{ color: "var(--foreground-muted)" }}
      >
        <MoreHorizontal size={17} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="행사 메뉴"
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border py-1 shadow-xl"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink()}
            className={menuItemClass}
            style={{ color: "var(--foreground)" }}
          >
            <Link2 size={13} aria-hidden /> 링크 복사
          </button>
          {canReport ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                reportRef.current?.open();
              }}
              className={menuItemClass}
              style={{ color: "var(--danger)" }}
            >
              <Flag size={13} aria-hidden /> 신고하기
            </button>
          ) : null}
        </div>
      ) : null}
      {canReport ? (
        <ReportButton ref={reportRef} hideTrigger targetType="CAMPAIGN" targetId={campaignId} ownedByMe={false} />
      ) : null}
    </div>
  );
}

export function CampaignHeaderCard({
  c,
  bookmarked,
  bookmarking,
  onBookmark,
  bookmarkDisabled,
}: {
  c: Campaign;
  bookmarked?: boolean;
  bookmarking?: boolean;
  onBookmark?: () => void;
  bookmarkDisabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 22 });
  const sy = useSpring(my, { stiffness: 150, damping: 22 });
  const rY = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const rX = useTransform(sy, [-0.5, 0.5], [5, -5]);
  const pct = progressPercent(c.joined, c.capacity);
  const lifecycle = campaignLifecycle(c);
  const progressLabel = campaignProgressLabel(c);
  // TODO(데이터: 장소·대상·참가비 필드 백엔드 추가 필요) — 값이 없는 행은 "추후 안내" 없이 아예 숨긴다.
  const optionalRows: { label: string; value: string }[] = [
    { label: "장소", value: c.place?.trim() ?? "" },
    { label: "대상", value: c.audience?.trim() ?? "" },
    { label: "참가비", value: c.fee?.trim() ?? "" },
    { label: "준비물", value: c.supplies?.trim() ?? "" },
    { label: "문의", value: c.contact?.trim() ?? "" },
  ].filter((row) => row.value);

  return (
    <div style={{ perspective: 1600 }}>
      <motion.div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        style={{
          rotateX: rX,
          rotateY: rY,
          transformStyle: "preserve-3d",
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
        className="rounded-3xl border overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.4)]"
      >
        <div className="grid grid-cols-1 md:grid-cols-[400px_1fr]">
          <div className="relative aspect-[4/3] sm:aspect-square md:aspect-auto overflow-hidden">
            <CampaignThumb src={c.thumb} alt={`${c.title} 행사 이미지`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--surface-dark)]/40 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-2" style={{ transform: "translateZ(50px)" }}>
              <StatusBadge c={c} />
              {c.ownedByMe ? (
                <span className="rounded-full bg-[var(--surface-dark)]/80 px-3 py-1.5 text-[11px] text-[var(--accent)]">
                  내가 개설
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <h1
                style={{
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: "clamp(28px, 3vw, 40px)",
                  color: "var(--foreground)",
                  lineHeight: 1.2,
                }}
              >
                {c.title}
              </h1>
              <div className="flex gap-2 flex-shrink-0">
                {onBookmark ? (
                  <button
                    type="button"
                    onClick={onBookmark}
                    disabled={bookmarkDisabled || bookmarking}
                    aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
                    className="flex h-9 w-9 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      background: bookmarked ? "var(--accent)" : "var(--border)",
                      color: bookmarked ? "var(--surface-dark)" : "var(--foreground)",
                    }}
                  >
                    <Bookmark size={14} fill={bookmarked ? "var(--surface-dark)" : "transparent"} />
                  </button>
                ) : null}
                <AdminModerationButton targetType="CAMPAIGN" targetId={c.id} />
                <CampaignActionsMenu campaignId={c.id} canReport={!c.ownedByMe} />
              </div>
            </div>

            <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              {c.summary}
            </p>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2" style={{ color: "var(--foreground)" }}>
              <div>
                <div className="opacity-60 mb-0.5">모집 기간</div>
                <div>{c.recruitStart} ~ {c.recruitEnd}</div>
              </div>
              <div>
                <div className="opacity-60 mb-0.5">진행 기간</div>
                <div>{c.runStart} ~ {c.runEnd}</div>
              </div>
              <div>
                <div className="opacity-60 mb-0.5">모집 인원</div>
                <div>{c.capacity > 0 ? `${c.joined}명 신청 / ${c.capacity}명 모집` : `${c.joined}명 신청 · 인원 미정`}</div>
              </div>
              {optionalRows.map((row) => (
                <div key={row.label}>
                  <div className="opacity-60 mb-0.5">{row.label}</div>
                  <div>{row.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div
                className="h-2 w-full rounded-full overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: lifecycle.badge.color }}
                />
              </div>
              <div className="flex justify-between text-[12px] mt-2" style={{ color: "var(--foreground-muted)" }}>
                <span>{progressLabel ?? "모집 인원 미정"}</span>
                {/* D-day 기준은 campaignLifecycle 주석 참고 — 카드와 동일 기준 */}
                <span>{lifecycle.dday}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <Avatar name={c.author.name} verified={c.author.verified} src={c.author.profileImageUrl ?? undefined} />
              <span style={{ color: "var(--foreground)" }}>{c.author.name}</span>
              <span className="text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>· 행사 주최자</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CampaignStatusManagement({
  c,
  ownershipConfirmed,
  updating,
  deleting,
  disabled,
  onChange,
  onDelete,
}: {
  c: Campaign;
  ownershipConfirmed: boolean;
  updating: boolean;
  deleting: boolean;
  disabled: boolean;
  onChange: (status: "open" | "closed") => void;
  onDelete: () => void;
}) {
  if (!ownershipConfirmed) return null;

  const target = c.status === "upcoming" ? "open" : c.status === "open" ? "closed" : null;
  const label = target === "open" ? "모집 시작" : target === "closed" ? "모집 마감" : "모집 마감됨";

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div>
        <p className="text-[13px] font-medium">모집 상태 관리</p>
        <p className="mt-0.5 text-[12px] opacity-60">행사 개설자만 모집을 시작하거나 마감할 수 있습니다.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/campaigns/${c.id}/participants`}
          aria-label="참가자 관리"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium ${
            disabled ? "pointer-events-none opacity-45" : ""
          }`}
          style={{
            background: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <Users size={14} /> 참가자 관리
        </Link>
        {c.status === "upcoming" ? (
          <Link
            href={`/campaigns/${c.id}/edit`}
            aria-label="행사 수정"
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium ${
              disabled ? "pointer-events-none opacity-45" : ""
            }`}
            style={{
              background: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <Pencil size={14} /> 행사 수정
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => target && onChange(target)}
          disabled={disabled || target === null}
          aria-label={label}
          className="rounded-full px-5 py-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            background: target === "closed" ? "var(--danger-soft)" : "var(--accent)",
            color: target === "closed" ? "var(--danger)" : "var(--surface-dark)",
          }}
        >
          {updating ? "처리 중…" : label}
        </button>
        {c.status === "upcoming" ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label="행사 삭제"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <Trash2 size={14} /> {deleting ? "삭제 중…" : "행사 삭제"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
