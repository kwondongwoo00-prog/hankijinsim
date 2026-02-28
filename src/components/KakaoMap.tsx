"use client";

import { useEffect, useRef } from "react";
import { Restaurant } from "@/types";

declare global {
  interface Window {
    kakao: { maps: typeof kakao.maps };
  }
}

interface KakaoMapProps {
  restaurants: Restaurant[];
  onMarkerClick?: (restaurant: Restaurant) => void;
}

export default function KakaoMap({
  restaurants,
  onMarkerClick,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const options: kakao.maps.MapOptions = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978), // 서울 시청
        level: 5,
      };
      mapInstanceRef.current = new window.kakao.maps.Map(
        mapRef.current!,
        options
      );
    });
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps || !restaurants.length)
      return;

    const bounds = new window.kakao.maps.LatLngBounds();

    restaurants.forEach((restaurant) => {
      const position = new window.kakao.maps.LatLng(
        Number(restaurant.y),
        Number(restaurant.x)
      );

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapInstanceRef.current!,
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:13px;white-space:nowrap;">${restaurant.place_name}</div>`,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        infowindow.open(mapInstanceRef.current!, marker);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => {
        infowindow.close();
      });

      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, "click", () => {
          onMarkerClick(restaurant);
        });
      }

      bounds.extend(position);
    });

    mapInstanceRef.current.setBounds(bounds);
  }, [restaurants, onMarkerClick]);

  return (
    <div
      ref={mapRef}
      className="h-64 w-full rounded-lg border border-gray-200 md:h-80"
    />
  );
}
