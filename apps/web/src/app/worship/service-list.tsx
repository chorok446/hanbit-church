import { Hourglass, MapPin, Users } from "lucide-react";
import { WORSHIP_SERVICES } from "@/data/church";

/** 예배 시간표 — 크림 밴드, 에디토리얼 목록. 시간(명조) | 예배명·설명·대상/소요 | 장소. */
export function ServiceList() {
  return (
    <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <ul className="border-t" style={{ borderColor: "var(--border)" }}>
          {WORSHIP_SERVICES.map((service) => (
            <li
              key={service.name}
              className="grid grid-cols-1 items-baseline gap-y-3 border-b py-7 sm:grid-cols-[170px_1fr_auto] sm:gap-x-6"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[24px] sm:text-[26px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {service.time}
              </span>
              <div className="min-w-0">
                <h3
                  className="text-[18px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                >
                  {service.name}
                </h3>
                {service.description ? (
                  <p className="mt-1.5 text-[14px] leading-[25px]" style={{ color: "var(--foreground-muted)" }}>
                    {service.description}
                  </p>
                ) : null}
                {(service.audience || service.duration) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                    {service.audience ? (
                      <span className="flex items-center gap-1.5">
                        <Users size={13} aria-hidden style={{ color: "var(--accent)" }} />
                        {service.audience}
                      </span>
                    ) : null}
                    {service.duration ? (
                      <span className="flex items-center gap-1.5">
                        <Hourglass size={13} aria-hidden style={{ color: "var(--accent)" }} />
                        {service.duration}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <span className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                <MapPin size={14} aria-hidden style={{ color: "var(--accent)" }} />
                {service.place}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
