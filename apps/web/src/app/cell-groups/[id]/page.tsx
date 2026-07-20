import type { Metadata } from "next";
import { CellGroupGuard } from "../cell-group-guard";
import { CellGroupDetailClient } from "./cell-group-detail-client";

export const metadata: Metadata = {
  title: "목장 상세",
  robots: { index: false, follow: false },
};

export default async function CellGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CellGroupGuard>
      <CellGroupDetailClient groupId={id} />
    </CellGroupGuard>
  );
}
