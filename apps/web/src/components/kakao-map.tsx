"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => unknown;
        Marker: new (opts: { map: unknown; position: unknown }) => unknown;
        services: {
          Geocoder: new () => {
            addressSearch: (
              addr: string,
              cb: (result: Array<{ x: string; y: string }>, status: string) => void,
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_ID = "kakao-map-sdk";

/** 주소를 지오코딩해 마커 하나를 띄우는 카카오맵. 키가 없거나 로드 실패 시 자리표시를 보여준다. */
export function KakaoMap({ address, className }: { address: string; className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!KAKAO_KEY || !mapRef.current) return;
    let cancelled = false;

    const init = () => {
      const kakao = window.kakao;
      if (cancelled || !kakao || !mapRef.current) return;
      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;
        // "(구칠리)" 같은 참고 표기는 지오코딩을 방해하므로 떼고 검색한다
        const query = address.replace(/\s*\([^)]*\)/g, "").trim();
        new kakao.maps.services.Geocoder().addressSearch(query, (result, status) => {
          if (cancelled || !mapRef.current) return;
          if (status !== kakao.maps.services.Status.OK || !result[0]) {
            setFailed(true);
            return;
          }
          const center = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
          const map = new kakao.maps.Map(mapRef.current, { center, level: 4 });
          new kakao.maps.Marker({ map, position: center });
        });
      });
    };

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao) init();
      else existing.addEventListener("load", init);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", init);
      };
    }

    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.addEventListener("load", init);
    script.addEventListener("error", () => !cancelled && setFailed(true));
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.removeEventListener("load", init);
    };
  }, [address]);

  if (!KAKAO_KEY || failed) {
    return (
      <div
        className={`flex items-center justify-center text-[13px] ${className ?? ""}`}
        style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
      >
        지도를 불러올 수 없습니다 — {address}
      </div>
    );
  }

  // data-third-party: axe 검사에서 SDK 생성 DOM(<area> 등)을 제외하는 마커.
  return <div ref={mapRef} data-third-party="kakao-map" role="img" className={className} aria-label={`지도: ${address}`} />;
}
