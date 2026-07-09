"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Calendar, CalendarRange, Users } from "lucide-react";
import {
  campaignLifecycle,
  campaignProgressLabel,
  type Campaign,
  type CampaignLifecycle,
} from "@/data/campaigns";
import { progressPercent } from "@/lib/progress";
import { CampaignThumb } from "./campaign-thumb";

function StatusBadge({ lifecycle }: { lifecycle: CampaignLifecycle }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] tracking-[0.2em]"
      style={{ background: lifecycle.badge.color, color: lifecycle.badge.fg }}
    >
      {lifecycle.badge.label}
    </span>
  );
}

function ProgressBar({ campaign, lifecycle }: { campaign: Campaign; lifecycle: CampaignLifecycle }) {
  const pct = progressPercent(campaign.joined, campaign.capacity);
  const progressLabel = campaignProgressLabel(campaign);
  return (
    <div className="w-full">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: lifecycle.badge.color }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: "var(--foreground-muted)" }}>
        <span>
          {campaign.capacity > 0 ? (
            <>
              <b style={{ color: lifecycle.badge.color }}>{campaign.joined}</b> / {campaign.capacity}명 신청
            </>
          ) : (
            "모집 인원 미정"
          )}
        </span>
        {progressLabel ? <span>{progressLabel}</span> : null}
      </div>
    </div>
  );
}

/** 상태별 카드 하단 CTA. 모집중→신청하기(상세), 모집마감→마감됨(disabled), 진행중/모집예정→상세보기, 종료→후기 보기(후기 탭). */
function CardCta({ campaign, lifecycle }: { campaign: Campaign; lifecycle: CampaignLifecycle }) {
  const base = "relative z-10 mt-1 flex w-full items-center justify-center rounded-xl px-4 py-3 text-[13px] font-medium";

  if (lifecycle.phase === "recruit_closed") {
    return (
      <button
        type="button"
        disabled
        className={`${base} cursor-not-allowed opacity-60`}
        style={{ background: "rgba(var(--ink-rgb), 0.07)", color: "var(--foreground-muted)" }}
      >
        마감됨
      </button>
    );
  }

  const { href, label } =
    lifecycle.phase === "recruiting"
      ? { href: `/campaigns/${campaign.id}`, label: "신청하기" }
      : lifecycle.phase === "ended"
        ? { href: `/campaigns/${campaign.id}?tab=proofs`, label: "후기 보기" }
        : { href: `/campaigns/${campaign.id}`, label: "상세보기" };

  return (
    <Link
      href={href}
      className={base}
      style={
        lifecycle.phase === "recruiting"
          ? { background: "var(--cta-bg)", color: "var(--cta-fg)" }
          : {
              background: "transparent",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }
      }
    >
      {label}
    </Link>
  );
}

export function CampaignListCard({ campaign }: { campaign: Campaign }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 200, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 22 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const lifecycle = campaignLifecycle(campaign);

  return (
    <div className="relative h-full" style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={(event) => {
          const rect = ref.current?.getBoundingClientRect();
          if (!rect) return;
          mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
          mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
        }}
        onMouseLeave={() => {
          mouseX.set(0);
          mouseY.set(0);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full overflow-hidden rounded-2xl border shadow-[0_20px_50px_-25px_rgba(0,0,0,0.5)]"
      >
        <div className="h-full" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="relative aspect-[4/3] overflow-hidden">
            <CampaignThumb
              src={campaign.thumb}
              alt={`${campaign.title} 행사 이미지`}
              thumbnail
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-dark)]/70 via-transparent to-transparent" />
            <div className="absolute right-3 top-3" style={{ transform: "translateZ(40px)" }}>
              <StatusBadge lifecycle={lifecycle} />
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-[12px] text-white/90">
              {/* D-day 기준은 campaignLifecycle 주석 참고 — 카드·상세 동일 기준 */}
              {lifecycle.dday}
            </div>
          </div>
          <div className="space-y-3 p-5">
            <h2
              style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 22,
                color: "var(--foreground)",
                lineHeight: 1.25,
              }}
            >
              {/* stretched link — 카드 전체가 상세로 연결되고, 하단 CTA 는 z-10 으로 그 위에 얹힌다 */}
              <Link
                href={`/campaigns/${campaign.id}`}
                className="after:absolute after:inset-0 after:z-0 after:cursor-pointer after:content-['']"
              >
                {campaign.title}
              </Link>
            </h2>
            <p className="line-clamp-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              {campaign.summary}
            </p>
            <div className="space-y-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              <p className="flex items-center gap-1.5">
                <Calendar size={12} aria-hidden /> 모집 {campaign.recruitStart} ~ {campaign.recruitEnd}
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarRange size={12} aria-hidden /> 진행 {campaign.runStart} ~ {campaign.runEnd}
              </p>
              {campaign.capacity > 0 ? (
                <p className="flex items-center gap-1.5">
                  <Users size={12} aria-hidden /> 모집 인원 {campaign.capacity}명
                </p>
              ) : null}
            </div>
            <ProgressBar campaign={campaign} lifecycle={lifecycle} />
            <CardCta campaign={campaign} lifecycle={lifecycle} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
