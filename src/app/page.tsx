"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import KakaoMap from "@/components/KakaoMap";
import RestaurantCard from "@/components/RestaurantCard";
import { Restaurant } from "@/types";

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "검색에 실패했습니다.");
      }

      setRestaurants(data.documents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "검색 중 오류가 발생했습니다."
      );
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white px-4 py-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-orange-500">한끼진심</h1>
        <p className="mt-1 text-sm text-gray-500">
          광고 없는 진짜 리뷰만 모아보세요
        </p>
      </header>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      <div className="mt-6">
        <KakaoMap restaurants={restaurants} />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
        {!isLoading && restaurants.length === 0 && !error && (
          <p className="py-12 text-center text-gray-400">
            식당을 검색해보세요
          </p>
        )}
      </div>
    </div>
  );
}
