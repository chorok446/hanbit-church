import { Clock, Hourglass, MapPin, Users } from "lucide-react";
import { WORSHIP_SERVICES } from "@/data/church";

/** 예배 카드 목록 — 예배명·시간·장소를 우선 노출하고 설명·대상·소요 시간은 보조로. */
export function ServiceList() {
  return (
    <ul className="mt-10 space-y-4">
      {WORSHIP_SERVICES.map((service) => (
        <li
          key={service.name}
          className="rounded-2xl border px-7 py-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3
              className="text-[19px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              {service.name}
            </h3>
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[14.5px]"
              style={{ color: "var(--foreground)" }}
            >
              <span className="flex items-center gap-2">
                <Clock size={15} aria-hidden style={{ color: "var(--accent)" }} />
                {service.time}
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={15} aria-hidden style={{ color: "var(--accent)" }} />
                {service.place}
              </span>
            </div>
          </div>

          {service.description ? (
            <p className="mt-3 text-[14px] leading-7" style={{ color: "var(--foreground-muted)" }}>
              {service.description}
            </p>
          ) : null}

          {(service.audience || service.duration) && (
            <div
              className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]"
              style={{ color: "var(--foreground-muted)" }}
            >
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
        </li>
      ))}
    </ul>
  );
}
