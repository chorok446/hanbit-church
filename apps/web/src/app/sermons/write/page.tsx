import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { SermonWriteClient } from "./sermon-write-client";

export const metadata: Metadata = {
  title: "설교 등록",
  description: `${CHURCH.name} 설교 말씀 등록 (스태프 전용)`,
  robots: { index: false },
};

export default function SermonWritePage() {
  return <SermonWriteClient />;
}
