import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { NewsWriteClient } from "./news-write-client";

export const metadata: Metadata = {
  title: "소식 작성",
  description: `${CHURCH.name} 공지·주보 작성 (스태프 전용)`,
  robots: { index: false },
};

export default function NewsWritePage() {
  return <NewsWriteClient />;
}
