"use client";

import { useParams, usePathname } from "next/navigation";
import NotFound from "@/app/not-found";
import { PostDetailSession } from "./post-detail-session";

export default function PostNotFound() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  return typeof id === "string" && pathname === `/posts/${encodeURIComponent(id)}` ? <PostDetailSession id={id} /> : <NotFound />;
}
