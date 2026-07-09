"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Flag,
  HeartHandshake,
  Inbox,
  ListTodo,
  Loader2,
  Megaphone,
  PenLine,
  ScrollText,
  ShieldBan,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { StatePanel } from "@/components/ui/state-panel";
import {
  fetchAdminLogs,
  fetchAdminSummary,
  fetchPendingUsers,
  type AdminActionLogItem,
  type AdminSummary,
} from "@/data/admin";
import { fetchNewFamilyPage } from "@/data/new-family";
import { useAdminProfile } from "./admin-guard";
import { ACTION_LABELS, RESTRICTIVE_ACTIONS } from "./logs/action-labels";
import { getAdminPermissions, type AdminPermissions } from "./permissions";
import { StatsChartSection } from "./stats-chart";

// 대시보드가 한 번에 병렬 조회하는 데이터: 요약 통계 + 오늘 처리할 일 카운트.
// 신고 검토 대기 수는 /api/admin/summary 의 pendingReports(status=PENDING 집계)를 그대로 쓴다
// — /api/admin/reports?status=PENDING 을 중복 호출하지 않기 위해서다.
type DashboardData = {
  summary: AdminSummary;
  /** 가입 승인 대기(총 건수) — fetchPendingUsers 의 totalElements */
  pendingApprovals: number;
  /** 아직 연락하지 않은 새가족 신청 건수 — fetchNewFamilyPage 의 pendingCount */
  pendingNewFamily: number;
};

// 저장된 결과의 tick 이 현재 retryTick 과 다르면 로딩 중으로 간주한다(effect 내 동기 setState 회피).
type DashboardResult = { tick: number; status: "success" | "error"; data: DashboardData | null };

const RECENT_LOGS_SIZE = 5;

// 빠른 작업: 자주 쓰는 작성·처리 화면으로 바로 이동한다. permission 이 없으면 숨긴다.
// TODO(콘텐츠 관리 탭: 전용 관리 페이지 필요) — 전용 페이지가 생기면 공지 작성·행사 만들기를
// 그 탭으로 옮기고 여기서는 탭 진입 링크만 남긴다.
const QUICK_ACTIONS: {
  href: string;
  label: string;
  icon: typeof Flag;
  permission: keyof AdminPermissions;
}[] = [
  // /posts/new 에서 관리자는 공지(NOTICE)·주보 카테고리를 선택할 수 있다(post-create-client).
  { href: "/posts/new", label: "공지 작성", icon: PenLine, permission: "canManageContent" },
  { href: "/events/new", label: "행사 만들기", icon: Megaphone, permission: "canManageContent" },
  { href: "/admin/approvals", label: "가입 승인", icon: UserCheck, permission: "canApproveSignups" },
  { href: "/admin/reports", label: "신고 관리", icon: Flag, permission: "canManageReports" },
  { href: "/admin/new-family", label: "새가족 확인", icon: HeartHandshake, permission: "canManageNewFamily" },
];

export default function DashboardClient() {
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<DashboardResult>({ tick: -1, status: "success", data: null });
  // 최근 활동은 보조 정보라 실패해도 대시보드를 막지 않는다(null = 로딩/실패 → 섹션 숨김).
  const [recentLogs, setRecentLogs] = useState<AdminActionLogItem[] | null>(null);
  const profile = useAdminProfile();
  const permissions = getAdminPermissions(profile.role);

  useEffect(() => {
    let cancelled = false;
    // 요약 통계와 오늘 처리할 일 카운트를 병렬 조회한다(size=1 — 목록이 아니라 건수만 필요).
    Promise.all([
      fetchAdminSummary(),
      fetchPendingUsers({ page: 0, size: 1 }),
      fetchNewFamilyPage({ page: 0, size: 1 }),
    ])
      .then(([summary, pendingUsers, newFamily]) => {
        if (cancelled) return;
        setResult({
          tick: retryTick,
          status: "success",
          data: {
            summary,
            pendingApprovals: pendingUsers.totalElements,
            pendingNewFamily: newFamily.pendingCount,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ tick: retryTick, status: "error", data: null });
      });
    fetchAdminLogs({ size: RECENT_LOGS_SIZE })
      .then((res) => {
        if (!cancelled) setRecentLogs(res.content);
      })
      .catch(() => {
        if (!cancelled) setRecentLogs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const state =
    result.tick !== retryTick
      ? ({ status: "loading" } as const)
      : result.status === "success" && result.data
        ? ({ status: "success", data: result.data } as const)
        : ({ status: "error" } as const);

  if (state.status === "loading") {
    return (
      <StatePanel compact>
        <Loader2 className="animate-spin" size={20} aria-hidden />
        <p>통계를 불러오는 중입니다…</p>
      </StatePanel>
    );
  }

  if (state.status === "error") {
    return (
      <StatePanel compact>
        <p>통계를 불러오지 못했습니다.</p>
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

  const { summary, pendingApprovals, pendingNewFamily } = state.data;

  // 오늘 처리할 일 — 권한이 있는 항목만 3열로 노출한다(건수 0도 표시해 "처리할 일 없음"을 드러낸다).
  // 각 항목은 성격에 맞는 틴트를 쓴다: 신고=danger, 승인=gold, 새가족=중립.
  // TODO(마감 임박 행사: 관리자용 마감 임박 행사 집계 데이터 함수가 생기면 항목 추가)
  const todos = [
    {
      key: "reports",
      href: "/admin/reports",
      icon: Flag,
      label: "신고 검토 대기",
      count: summary.pendingReports,
      unit: "건",
      permission: "canManageReports" as const,
      tintBg: "rgba(var(--danger-rgb), 0.08)",
      numberColor: "var(--danger)",
    },
    {
      key: "approvals",
      href: "/admin/approvals",
      icon: UserCheck,
      label: "가입 승인 대기",
      count: pendingApprovals,
      unit: "건",
      permission: "canApproveSignups" as const,
      tintBg: "var(--accent-soft)",
      numberColor: "var(--accent-strong)",
    },
    {
      key: "new-family",
      href: "/admin/new-family",
      icon: HeartHandshake,
      label: "새가족 신청",
      count: pendingNewFamily,
      unit: "건",
      permission: "canManageNewFamily" as const,
      tintBg: "var(--chip-bg)",
      numberColor: "var(--heading)",
    },
  ].filter((todo) => permissions[todo.permission]);

  // 통계 카드: 모두 관련 화면으로 들어가는 진입점이다.
  // TODO(콘텐츠 관리 탭: 전용 관리 페이지 필요) — 게시글·행사는 전용 관리 페이지가 없어
  // 우선 공개 목록(/news, /events)으로 연결한다.
  const statCards = [
    { label: "활동 회원", value: summary.users, unit: "명", icon: Users, href: "/admin/users", destination: "회원 관리" },
    { label: "게시글", value: summary.posts, unit: "건", icon: FileText, href: "/news", destination: "소식" },
    { label: "행사", value: summary.events, unit: "건", icon: Megaphone, href: "/events", destination: "행사·사역" },
    { label: "누적 신고", value: summary.totalReports, unit: "건", icon: Inbox, href: "/admin/reports", destination: "신고 관리" },
  ];

  const quickActions = QUICK_ACTIONS.filter(({ permission }) => permissions[permission]);

  return (
    <div className="space-y-6">
      {/* 오늘 처리할 일 — 대기 중인 작업 큐를 통계보다 먼저, 3열 틴트 카드로 보여준다. */}
      {todos.length > 0 && (
        <section aria-labelledby="admin-todo-heading">
          <h2
            id="admin-todo-heading"
            className="mb-3.5 inline-flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            <ListTodo size={16} aria-hidden style={{ color: "var(--accent-secondary)" }} />
            오늘 처리할 일
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {todos.map(({ key, href, icon: Icon, label, count, unit, tintBg, numberColor }) => (
              <Link
                key={key}
                href={href}
                aria-label={`${label} ${count.toLocaleString()}${unit} 확인하기`}
                className="group flex flex-col gap-3 rounded-3xl border p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
                style={{ background: tintBg, borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                  <Icon size={16} aria-hidden style={{ color: numberColor }} />
                  {label}
                </span>
                <span className="flex items-baseline gap-1">
                  <b
                    className="text-[30px] leading-none"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: numberColor }}
                  >
                    {count.toLocaleString()}
                  </b>
                  <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                    {unit}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[12.5px]"
                  style={{ color: "var(--accent-strong)" }}
                >
                  확인하기
                  <ArrowUpRight size={13} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 통계 카드 4열 — 각 항목의 관리 화면 진입점. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(({ label, value, unit, icon: Icon, href, destination }) => (
          <Link
            key={label}
            href={href}
            aria-label={`${label} ${value.toLocaleString()}${unit} — ${destination}(으)로 이동`}
            className="group rounded-3xl border p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <Icon size={18} aria-hidden style={{ color: "var(--accent-secondary)" }} />
            <p className="mt-3 flex items-baseline gap-1">
              <span
                className="text-[30px] leading-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {value.toLocaleString()}
              </span>
              <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                {unit}
              </span>
            </p>
            <p className="mt-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {label}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1 text-[12px]"
              style={{ color: "var(--accent-strong)" }}
            >
              {destination}
              <ArrowUpRight size={12} aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      {/* 처리 대기 신고 + 정지 중 회원 — 관리자 핵심 작업 큐 2열. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QueueCard
          href="/admin/reports"
          icon={Flag}
          title="처리 대기 신고"
          description={
            summary.pendingReports > 0
              ? "확인이 필요한 신고가 있습니다. 눌러서 신고 관리로 이동하세요."
              : "대기 중인 신고가 없습니다."
          }
          count={summary.pendingReports}
          countLabel={`대기 신고 ${summary.pendingReports}건`}
          ctaLabel="신고 관리로 이동"
          tone={summary.pendingReports > 0 ? "danger" : "neutral"}
        />
        <QueueCard
          href="/admin/users?filter=suspended"
          icon={ShieldBan}
          title="정지 중 회원"
          description={
            summary.suspendedUsers > 0
              ? "현재 이용이 정지된 계정입니다. 눌러서 목록을 확인하세요."
              : "정지 중인 회원이 없습니다."
          }
          count={summary.suspendedUsers}
          countLabel={`정지 중 회원 ${summary.suspendedUsers}명`}
          ctaLabel="회원 관리로 이동"
          tone="neutral"
        />
      </div>

      {/* 빠른 작업 — 자주 쓰는 작성·처리 화면 바로가기. */}
      {quickActions.length > 0 && (
        <section
          aria-labelledby="admin-quick-heading"
          className="rounded-3xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <h2 id="admin-quick-heading" className="mb-4 inline-flex items-center gap-2 text-[14px] font-semibold">
            <Zap size={16} aria-hidden style={{ color: "var(--accent-secondary)" }} />
            빠른 작업
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] transition-colors hover:bg-[var(--surface-muted)]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <Icon size={14} aria-hidden style={{ color: "var(--accent-secondary)" }} />
                {label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <StatsChartSection />

      {/* 최근 활동 — 감사 로그 최신 5건 요약. 조회 실패 시(null)에는 섹션을 숨긴다. */}
      {recentLogs !== null && (
        <section
          aria-labelledby="admin-recent-heading"
          className="rounded-3xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="admin-recent-heading" className="inline-flex items-center gap-2 text-[14px] font-semibold">
              <ScrollText size={16} aria-hidden style={{ color: "var(--accent-secondary)" }} />
              최근 활동
            </h2>
            <Link href="/admin/logs" className="text-[12px] hover:underline" style={{ color: "var(--foreground-muted)" }}>
              전체 보기
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              최근 활동이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={
                      RESTRICTIVE_ACTIONS.has(log.action)
                        ? { background: "var(--danger-soft)", color: "var(--danger)" }
                        : { background: "var(--accent-soft)", color: "var(--accent-secondary)" }
                    }
                  >
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <span>{log.admin.name}</span>
                  {log.detail && (
                    <span className="min-w-0 truncate" style={{ color: "var(--foreground-muted)" }}>
                      {log.detail}
                    </span>
                  )}
                  <span className="ml-auto text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                    {new Date(log.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function QueueCard({
  href,
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  ctaLabel,
  tone,
}: {
  href: string;
  icon: typeof Flag;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  ctaLabel: string;
  /** danger = 대기 신고 강조(테두리·뱃지·숫자 danger), neutral = 기본 카드 */
  tone: "danger" | "neutral";
}) {
  const danger = tone === "danger";
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-3xl border p-6 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
      style={{
        background: "var(--card)",
        borderColor: danger ? "var(--danger-soft)" : "var(--border)",
        color: "var(--foreground)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon size={20} aria-hidden style={{ color: danger ? "var(--danger)" : "var(--accent-secondary)" }} />
          <div>
            <p className="text-[14px] font-semibold">{title}</p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {description}
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={
            danger && count > 0
              ? { background: "var(--danger-soft)", color: "var(--danger)" }
              : { background: "var(--chip-bg)", color: "var(--foreground-muted)" }
          }
          aria-label={countLabel}
        >
          <b style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{count.toLocaleString()}</b>
        </span>
      </div>
      <span
        className="inline-flex items-center gap-1 self-start rounded-full px-4 py-2 text-[12.5px] transition-opacity group-hover:opacity-90"
        style={
          danger
            ? { background: "var(--cta-bg)", color: "var(--cta-fg)" }
            : { background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }
        }
      >
        {ctaLabel}
        <ArrowUpRight size={13} aria-hidden />
      </span>
    </Link>
  );
}
