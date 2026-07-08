import { Suspense } from "react";
import CampaignListClient from "./campaign-list-client";

function CampaignListFallback() {
  return (
    <section className="min-h-screen bg-[#f9f7f2] px-6 pb-20 pt-32 text-center text-[var(--heading)]/60 dark:bg-[var(--surface-dark)] dark:text-white/60">
      행사 검색 조건을 불러오는 중입니다.
    </section>
  );
}

export default function CampaignListPage() {
  return (
    <Suspense fallback={<CampaignListFallback />}>
      <CampaignListClient />
    </Suspense>
  );
}
