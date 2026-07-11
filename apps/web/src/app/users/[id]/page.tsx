import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { apiGetOrNullWithCookies } from "@/lib/api-server";
import type { PublicUser } from "@/data/users";
import { UserProfileClient } from "./user-profile-client";

// 프로필은 로그인한 교인 전용(백엔드 401) — 요청 쿠키를 전달해 로그인 사용자는 SSR 로 보고,
// 비로그인은 "unauthorized" 마커로 로그인 안내를 렌더한다(404 와 구분).
const getUser = cache(async (id: string): Promise<PublicUser | "unauthorized" | null> => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  try {
    return await apiGetOrNullWithCookies<PublicUser>(`/api/users/${numericId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return "unauthorized";
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);
  if (!user || user === "unauthorized") return { title: "교우 프로필", robots: { index: false, follow: false } };
  return {
    title: `${user.name}님의 프로필`,
    description: `${user.name}님이 작성한 게시글 ${user.postCount}개`,
    robots: { index: false, follow: false },
  };
}

function LoginRequired({ userId }: { userId: string }) {
  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-32">
      <div className="max-w-md text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Members Only
        </p>
        <h1
          className="mt-3 text-[26px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          교우 프로필은 로그인 후 볼 수 있어요
        </h1>
        <p className="mt-3 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
          교우 보호를 위해 프로필은 로그인한 교인에게만 공개됩니다.
        </p>
        <Link
          href={`/login?next=/users/${userId}`}
          className="cta-solid mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-medium"
        >
          로그인
        </Link>
      </div>
    </section>
  );
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (user === "unauthorized") return <LoginRequired userId={id} />;
  if (!user) notFound();
  return <UserProfileClient user={user} />;
}
