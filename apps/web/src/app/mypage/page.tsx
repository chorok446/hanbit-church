import { Suspense } from "react";
import MyPageClient from "./mypage-client";

function MyPageFallback() {
  return (
    <section className="min-h-screen bg-[#f9f7f2] px-6 pb-20 pt-32 text-center text-[var(--heading)]/60 dark:bg-[var(--surface-dark)] dark:text-white/60">
      마이페이지를 불러오는 중입니다.
    </section>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<MyPageFallback />}>
      <MyPageClient />
    </Suspense>
  );
}
