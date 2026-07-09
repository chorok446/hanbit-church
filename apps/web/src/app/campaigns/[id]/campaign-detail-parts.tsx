"use client";

import { CalendarRange, Info, Package, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { RichBodyImageGrid } from "@/components/rich-body-image-grid";
import { PostText } from "@/components/post-text";
import type { Campaign } from "@/data/campaigns";

function InfoSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <h3
        className="flex items-center gap-2 text-[15px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        <span style={{ color: "var(--accent)" }} aria-hidden>{icon}</span>
        {title}
      </h3>
      <div className="mt-2 text-[13.5px] leading-7" style={{ color: "var(--foreground-muted)" }}>
        {children}
      </div>
    </section>
  );
}

export function CampaignContentTab({ c }: { c: Campaign }) {
  return (
    <div
      className="rounded-3xl border p-6 sm:p-10 space-y-8"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, color: "var(--foreground)" }}>
        {c.body.heading}
      </h2>
      {c.body.paragraphs.map((p, i) => (
        <PostText
          key={i}
          text={p}
          style={{ color: "var(--foreground-muted)", lineHeight: 1.8 }}
        />
      ))}
      <RichBodyImageGrid images={c.body.images} altPrefix="행사 상세 이미지" />

      {/* 소개 외 실무 안내 — 준비물·문의는 아직 데이터가 없어 일반 안내 문구로 대신한다.
          TODO(데이터: 장소·대상·참가비 필드 백엔드 추가 필요) — supplies/contact 값이 생기면 그대로 노출된다. */}
      <div className="space-y-6 border-t pt-8" style={{ borderColor: "var(--border)" }}>
        <InfoSection icon={<CalendarRange size={15} />} title="일정 안내">
          <p>모집 기간: {c.recruitStart} ~ {c.recruitEnd}</p>
          <p>진행 기간: {c.runStart} ~ {c.runEnd}</p>
        </InfoSection>
        <InfoSection icon={<Package size={15} />} title="준비물">
          <p>{c.supplies?.trim() || "준비물이 필요한 경우 신청자에게 담당자가 별도로 안내드립니다."}</p>
        </InfoSection>
        <InfoSection icon={<Info size={15} />} title="유의사항">
          <p>신청 후 참석이 어려워지면 모집 마감 전에 참여를 취소해주세요. 모집 마감 후에는 취소가 어렵습니다.</p>
        </InfoSection>
        <InfoSection icon={<Phone size={15} />} title="문의">
          <p>{c.contact?.trim() || "행사에 대한 문의는 교회 사무실 또는 행사 담당자에게 해주세요."}</p>
        </InfoSection>
      </div>
    </div>
  );
}
