import { Bus, CarFront, Mail, MapPin, Phone } from "lucide-react";
import { CHURCH } from "@/data/church";
import { KakaoMap } from "@/components/kakao-map";
import { LocationActions } from "./location-actions";

/** 오시는 길 — 크림 밴드, 2열(연락처·액션·주차/대중교통 | 지도). */
export function LocationSection() {
  return (
    <section id="location" className="scroll-mt-16 px-6 py-24" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
        <h2
          className="mt-2 mb-7 text-[26px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          오시는 길
        </h2>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr] lg:items-stretch">
          <div className="flex flex-col">
            <div className="space-y-3.5">
              <p className="flex items-start gap-2.5 text-[14.5px] leading-[27px]" style={{ color: "var(--foreground)" }}>
                <MapPin size={15} aria-hidden className="mt-1.5 shrink-0" style={{ color: "var(--accent)" }} />
                {CHURCH.address}
              </p>
              <p className="flex items-center gap-2.5 text-[14.5px]" style={{ color: "var(--foreground)" }}>
                <Phone size={15} aria-hidden className="shrink-0" style={{ color: "var(--accent)" }} />
                {CHURCH.phone}
              </p>
              {CHURCH.email ? (
                <p className="flex items-center gap-2.5 text-[14.5px]" style={{ color: "var(--foreground)" }}>
                  <Mail size={15} aria-hidden className="shrink-0" style={{ color: "var(--accent)" }} />
                  {CHURCH.email}
                </p>
              ) : null}
            </div>

            <LocationActions address={CHURCH.address} />

            <div className="mt-6 flex flex-col gap-3">
              <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--heading)" }}>
                  <CarFront size={15} aria-hidden style={{ color: "var(--accent)" }} />
                  주차 안내
                </p>
                {/* TODO(교회 확인): 주차장 위치·규모 확인 후 실제 안내로 교체 */}
                <p className="mt-2 text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                  차량으로 오시는 분은 교회 주변 주차 공간을 이용하실 수 있습니다.
                </p>
              </div>
              <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--heading)" }}>
                  <Bus size={15} aria-hidden style={{ color: "var(--accent)" }} />
                  대중교통 안내
                </p>
                {/* TODO(교회 확인): 버스 노선·정류장 등 대중교통 경로 확인 후 교체 */}
                <p className="mt-2 text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                  대중교통 이용 안내는 준비 중입니다. 방문 전 교회로 연락 주시면 자세히 안내해 드립니다.
                </p>
              </div>
            </div>
          </div>

          <KakaoMap address={CHURCH.address} className="min-h-[380px] overflow-hidden rounded-[20px]" />
        </div>
      </div>
    </section>
  );
}
