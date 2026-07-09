"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { StaggerItem } from "@/components/scroll-reveal";
import { SkeletonCards } from "@/components/ui/skeleton-cards";
import {
  appendCampaignDateRangeFilters,
  campaignDateRangeError,
  readCampaignDateRangeFilters,
  type CampaignSearchResponse,
} from "@/data/campaigns";
import { getSessionId } from "@/lib/auth";
import { ApiError, apiGet } from "@/lib/api";
import { beginAuthedRequest, clearSessionIfUnauthorized, staleByIdentity } from "@/lib/authed-request";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";
import {
  useCanonicalUrl,
  parsePageParam,
  buildCampaignsHref,
  parseCampaignListView,
  type CampaignListUrlState,
} from "@/lib/use-url-query";
import { PageShell } from "@/components/page-shell";
import { CampaignCalendarView } from "./campaign-calendar";
import { CampaignListCard } from "./campaign-list-cards";
import {
  CampaignListFilters,
  campaignHasActiveFilters,
  EMPTY_CAMPAIGN_DATE_RANGE_FILTERS,
  parseCampaignListFilter,
  parseCampaignListRecruitState,
  parseCampaignListSort,
} from "./campaign-list-filters";

type SearchState = {
  identity: string;
  status: "loading" | "success" | "error";
  response: CampaignSearchResponse | null;
  errorMessage: string | null;
};

export default function CampaignListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId: token } = useAuthSession();
  // 행사 개설은 관리자 전용. TODO(권한: 사역 담당자 역할 도입 시 확장)
  const { profile } = useCurrentUserProfile();
  // 행사 개설 권한(최고 관리자·운영자·사역 담당자).
  const canCreate = getAdminPermissions(profile?.role).canManageEvents;
  const [retryTick, setRetryTick] = useState(0);
  const generationRef = useRef(0);

  const urlState = useMemo<CampaignListUrlState>(() => ({
    query: searchParams.get("q") ?? "",
    filter: parseCampaignListFilter(searchParams.get("status")),
    recruitState: parseCampaignListRecruitState(searchParams.get("recruitState")),
    availableOnly: searchParams.get("availableOnly") === "true",
    ...readCampaignDateRangeFilters(searchParams),
    sort: parseCampaignListSort(searchParams.get("sort")),
    page: parsePageParam(searchParams.get("page")),
    view: parseCampaignListView(searchParams.get("view")),
  }), [searchParams]);

  const canonicalHref = buildCampaignsHref(urlState);
  const currentHref = searchParams.toString() ? `/campaigns?${searchParams.toString()}` : "/campaigns";
  const dateFilterError = campaignDateRangeError(urlState);

  useCanonicalUrl(canonicalHref, currentHref);
  const requestIdentity = JSON.stringify([token, urlState, retryTick]);
  const [searchState, setSearchState] = useState<SearchState>({
    identity: "",
    status: "loading",
    response: null,
    errorMessage: null,
  });
  const currentState = staleByIdentity(searchState, requestIdentity, {
    identity: requestIdentity,
    status: "loading",
    response: null,
    errorMessage: null,
  });

  const sectionRef = useRef<HTMLElement>(null);

  const updateUrl = useCallback((changes: Partial<CampaignListUrlState>, replace = false) => {
    const href = buildCampaignsHref({ ...urlState, ...changes });
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router, urlState]);

  const commitSearch = useCallback((query: string) => {
    updateUrl({ query, page: 0 }, true);
  }, [updateUrl]);

  useEffect(() => {
    if (getSessionId() !== token) return;
    // 캘린더 보기는 CampaignCalendarView 가 전체 목록(/api/campaigns)을 따로 불러온다.
    if (urlState.view === "calendar") return;

    const params = new URLSearchParams();
    if (urlState.query) params.set("q", urlState.query);
    if (urlState.filter !== "all") params.set("status", urlState.filter);
    if (urlState.recruitState) params.set("recruitState", urlState.recruitState);
    params.set("availableOnly", urlState.availableOnly.toString());
    appendCampaignDateRangeFilters(params, {
      recruitEndFrom: urlState.recruitEndFrom,
      recruitEndTo: urlState.recruitEndTo,
      runStartFrom: urlState.runStartFrom,
      runStartTo: urlState.runStartTo,
    });
    params.set("sort", urlState.sort);
    params.set("page", urlState.page.toString());
    params.set("size", "9");

    const guard = beginAuthedRequest(generationRef, token);

    apiGet<CampaignSearchResponse>(`/api/campaigns/search?${params.toString()}`)
      .then((response) => {
        if (!guard.isCurrent()) return;
        setSearchState({ identity: requestIdentity, status: "success", response, errorMessage: null });
      })
      .catch((error) => {
        if (!guard.isCurrent()) return;
        if (clearSessionIfUnauthorized(error, token)) return;
        const errorMessage = error instanceof ApiError && error.status === 400
          ? dateFilterError ?? "날짜 형식이 올바르지 않습니다."
          : "행사를 불러오지 못했습니다.";
        setSearchState({ identity: requestIdentity, status: "error", response: null, errorMessage });
      });

    return guard.cancel;
  }, [
    requestIdentity,
    token,
    dateFilterError,
    urlState.availableOnly,
    urlState.filter,
    urlState.page,
    urlState.query,
    urlState.recruitEndFrom,
    urlState.recruitEndTo,
    urlState.recruitState,
    urlState.runStartFrom,
    urlState.runStartTo,
    urlState.sort,
    urlState.view,
  ]);

  const response = currentState.response;
  const resetFilters = () => updateUrl({
    query: "",
    filter: "all",
    recruitState: null,
    availableOnly: false,
    sort: "latest",
    ...EMPTY_CAMPAIGN_DATE_RANGE_FILTERS,
    page: 0,
  });

  return (
    <>
      {/* 컴팩트 네이비 밴드 — 교제(feed) 헤더와 동일 패턴. 좌: 소개, 우: 행사 개설(스태프 전용). */}
      <section className="px-6 pb-11 pt-[124px]" style={{ background: "var(--banner-bg)" }}>
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>
              Events &amp; Ministry
            </p>
            <h1
              className="text-[34px] sm:text-[42px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#f6f3ea", lineHeight: 1.15 }}
            >
              행사·사역
            </h1>
            <p className="mt-3 max-w-xl text-[14px]" style={{ color: "rgba(246,243,234,0.72)" }}>
              함께 예배하고, 섬기고, 교제하는 자리에 초대합니다. 모집 중인 행사와 사역을 확인하고 참여 신청을 해보세요.
            </p>
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={() => router.push("/campaigns/new")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium transition-transform hover:-translate-y-0.5"
              style={{ background: "#f6f3ea", color: "var(--banner-bg)" }}
            >
              <Plus size={15} aria-hidden /> 행사 개설
            </button>
          ) : null}
        </div>
      </section>

      <PageShell ref={sectionRef} paddingClassName="relative min-h-screen overflow-hidden px-6 pb-20 pt-10" orb="right">
        <div className="relative mx-auto max-w-5xl">
        {/* 카드/캘린더 보기 전환 — 기본은 카드, `?view=calendar` 로 딥링크 가능 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div
            className="flex rounded-full border p-0.5"
            role="tablist"
            aria-label="보기 형식"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            {([
              { value: "card", label: "카드 보기" },
              { value: "calendar", label: "캘린더 보기" },
            ] as const).map((tab) => {
              const active = urlState.view === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => updateUrl({ view: tab.value })}
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                  style={
                    active
                      ? { background: "var(--cta-bg)", color: "var(--cta-fg)" }
                      : { color: "var(--foreground-muted)" }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {urlState.view !== "calendar" && currentState.status === "success" && response ? (
            <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              검색 결과 {response.totalElements.toLocaleString()}개
            </p>
          ) : null}
        </div>

        {urlState.view === "calendar" ? <CampaignCalendarView /> : (
        <>
        <CampaignListFilters
          state={urlState}
          loading={currentState.status === "loading"}
          onFilter={(filter) => updateUrl({ filter, page: 0 })}
          onSearch={commitSearch}
          onSort={(sort) => updateUrl({ sort, page: 0 })}
          onRecruitState={(recruitState) => updateUrl({ recruitState, page: 0 })}
          onAvailableOnly={(availableOnly) => updateUrl({ availableOnly, page: 0 })}
          onDateChange={(field, value) => updateUrl({ [field]: value, page: 0 })}
          onClearDates={() => updateUrl({ ...EMPTY_CAMPAIGN_DATE_RANGE_FILTERS, page: 0 })}
          onPatch={(changes) => updateUrl(changes)}
          onResetAll={resetFilters}
        />

        {currentState.status === "loading" ? (
          <SkeletonCards count={6} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" />
        ) : null}

        {currentState.status === "error" ? (
          <StatePanel>
            <p style={{ color: "var(--foreground-muted)" }}>
              {currentState.errorMessage ?? "행사를 불러오지 못했습니다."}
            </p>
            <button
              type="button"
              onClick={() => setRetryTick((tick) => tick + 1)}
              className="rounded-full px-5 py-2 text-[13px]"
              style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
            >
              다시 시도
            </button>
          </StatePanel>
        ) : null}

        {currentState.status === "success" && response?.content.length === 0 ? (
          <ListEmptyState
            title={campaignHasActiveFilters(urlState) ? "조건에 맞는 행사가 없어요." : "아직 등록된 행사가 없어요."}
            description={
              campaignHasActiveFilters(urlState)
                ? "다른 검색어를 입력하거나 필터를 초기화해보세요."
                : "첫 행사를 만들거나 잠시 후 다시 확인해보세요."
            }
            action={
              campaignHasActiveFilters(urlState) ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full px-5 py-2 text-[13px] font-medium"
                  style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
                >
                  전체 행사 보기
                </button>
              ) : canCreate ? (
                <button
                  type="button"
                  onClick={() => router.push("/campaigns/new")}
                  className="rounded-full px-5 py-2 text-[13px] font-medium"
                  style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
                >
                  행사 만들기
                </button>
              ) : null
            }
          />
        ) : null}

        {currentState.status === "success" && response && response.content.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {response.content.map((campaign, i) => (
              <StaggerItem key={campaign.id} index={i}>
                <CampaignListCard campaign={campaign} />
              </StaggerItem>
            ))}
          </div>
        ) : null}

        {currentState.status === "success" && response && response.totalElements > 0 ? (
          response.totalPages > 1 ? (
            <Pagination
              page={response.page}
              totalPages={response.totalPages}
              totalElements={response.totalElements}
              className="mt-10"
              onPageChange={(page) => updateUrl({ page })}
            />
          ) : (
            // 1페이지뿐이면 이전/다음 버튼 없이 총 개수만 낮은 위계로 표시한다.
            <p className="mt-10 text-center text-[12px] opacity-65" style={{ color: "var(--foreground)" }}>
              총 {response.totalElements.toLocaleString()}개
            </p>
          )
        ) : null}
        </>
        )}
        </div>
      </PageShell>
    </>
  );
}
