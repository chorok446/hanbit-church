import { CHURCH_STAFF } from "@/data/church";

/** 섬기는 사람들 — 발자취·공동체와 같은 에디토리얼 리듬(상단 구분선 + 명조 직분). */
export function ServantsSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
        <h2
          className="mt-2 text-[28px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          섬기는 사람들
        </h2>
        <ul className="mt-11 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {CHURCH_STAFF.map((staff) => (
            <li key={staff.role} className="border-t pt-5" style={{ borderColor: "rgba(var(--ink-rgb), 0.25)" }}>
              <h3
                className="text-[19px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {staff.role}
              </h3>
              <p className="mt-1 text-[14px] font-medium" style={{ color: "var(--foreground)" }}>
                {staff.name || " "}
              </p>
              {staff.note ? (
                <p className="mt-2 text-[13.5px] leading-[25px]" style={{ color: "var(--foreground-muted)" }}>
                  {staff.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
