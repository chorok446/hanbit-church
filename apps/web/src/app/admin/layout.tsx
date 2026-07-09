import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { AdminGuard } from "./admin-guard";
import { AdminNav } from "./admin-nav";

// 관리자 화면은 검색엔진에 노출하지 않는다.
export const metadata: Metadata = {
  // 루트 레이아웃의 title template("%s | 교회명")이 교회명을 붙인다.
  title: "관리자",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      {/* 상단 네이비 밴드(풀블리드) + 관리자 메뉴 */}
      <AdminNav />
      {/* 밴드 아래 대시보드/서브페이지 본문 — 페이지 그라디언트 위 흰 카드들 */}
      <PageShell orb="none" paddingClassName="px-6 pb-20 pt-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </PageShell>
    </AdminGuard>
  );
}
