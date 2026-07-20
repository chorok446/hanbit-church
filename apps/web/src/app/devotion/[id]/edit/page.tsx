import type { Metadata } from "next";
import { CHURCH } from "@/data/church";
import { DevotionForm } from "@/components/devotion-form";

export const metadata: Metadata = {
  title: "큐티 수정",
  description: `${CHURCH.name} 오늘의 말씀·묵상 수정 (스태프 전용)`,
  robots: { index: false },
};

export default async function DevotionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="px-6 pb-24 pt-32" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-[26px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
          큐티 수정
        </h1>
        <DevotionForm id={id} />
      </div>
    </main>
  );
}
