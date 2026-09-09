import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGetOrNullWithCookies } from "@/lib/api-server";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";
import PostDetailClient from "./post-detail-client";
import { PostDetailSession } from "./post-detail-session";
import { postJsonLd, serializeJsonLd } from "@/lib/json-ld";

// generateMetadata 와 페이지 본문이 같은 요청 안에서 fetch 를 공유하도록 dedupe.
const getPost = cache((id: string) => apiGetOrNullWithCookies<Post>(`/api/posts/${id}`));

function postTitle(post: Post): string {
  const firstLine = post.text.split("\n")[0].trim();
  return firstLine.length > 50 ? `${firstLine.slice(0, 50)}…` : firstLine;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return {};
  if (post.hidden || post.visibility === "MEMBERS") return { title: "게시글", robots: { index: false, follow: false } };
  const title = postTitle(post);
  const description = `${post.author.name}님의 게시글`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.images.length > 0 ? [post.images[0]] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const linkedEvent = post.eventId
    ? await apiGetOrNullWithCookies<Event>(`/api/events/${post.eventId}`)
    : null;
  if (post.hidden || post.visibility === "MEMBERS") {
    return <PostDetailSession id={id} initialData={{ post, linkedEvent }} />;
  }
  return (
    <>
      {/* 검색엔진 리치 스니펫용 구조화 데이터. serializeJsonLd 가 사용자 입력의 태그 주입을 막는다. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(postJsonLd(post)) }} />
      <PostDetailClient post={post} linkedEvent={linkedEvent} />
    </>
  );
}
