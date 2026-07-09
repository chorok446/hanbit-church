import { Bus, CarFront, Mail, MapPin, Phone } from "lucide-react";
import { CHURCH } from "@/data/church";
import { KakaoMap } from "@/components/kakao-map";
import { LocationActions } from "./location-actions";

/** 오시는 길 — 연락처·액션 버튼·지도·주차/대중교통 안내. */
export function LocationSection() {
  return (
    <>
      <h2
        className="mt-16 text-[22px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
      >
        오시는 길
      </h2>
      <div
        className="mt-6 rounded-3xl border p-8"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="space-y-2.5">
          <p className="flex items-start gap-2 text-[15px] leading-7" style={{ color: "var(--foreground)" }}>
            <MapPin size={15} aria-hidden className="mt-1.5 shrink-0" style={{ color: "var(--accent)" }} />
            {CHURCH.address}
          </p>
          <p className="flex items-center gap-2 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            <Phone size={15} aria-hidden className="shrink-0" style={{ color: "var(--accent)" }} />
            {CHURCH.phone}
          </p>
          <p className="flex items-center gap-2 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            <Mail size={15} aria-hidden className="shrink-0" style={{ color: "var(--accent)" }} />
            {CHURCH.email}
          </p>
        </div>

        <LocationActions address={CHURCH.address} />

        <KakaoMap address={CHURCH.address} className="mt-6 h-72 overflow-hidden rounded-2xl" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--heading)" }}>
              <CarFront size={15} aria-hidden style={{ color: "var(--accent)" }} />
              주차 안내
            </p>
            {/* TODO(교회 확인): 주차장 위치·규모 확인 후 실제 안내로 교체 */}
            <p className="mt-2 text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
              차량으로 오시는 분은 교회 주변 주차 공간을 이용하실 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
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
    </>
  );
}
