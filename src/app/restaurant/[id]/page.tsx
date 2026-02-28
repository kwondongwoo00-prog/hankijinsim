"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReviewCard from "@/components/ReviewCard";
import { FilteredReview } from "@/types";

export default function RestaurantPage() {
  const params = useParams();
  const [reviews, setReviews] = useState<FilteredReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAds, setShowAds] = useState(false);

  // id 파라미터에서 식당 이름을 디코딩 (실제로는 별도 조회 필요)
  const restaurantName = decodeURIComponent(params.id as string);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(
          `/api/reviews?query=${encodeURIComponent(restaurantName)}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "리뷰를 불러오지 못했습니다.");
        }

        setReviews(data.reviews);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "리뷰 로딩 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [restaurantName]);

  const displayedReviews = showAds
    ? reviews
    : reviews.filter((r) => !r.isAd);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white px-4 py-6">
      <header className="mb-6">
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-orange-500"
        >
          &larr; 뒤로가기
        </a>
        <h1 className="mt-2 text-xl font-bold text-gray-900">
          {restaurantName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">블로그 리뷰 분석 결과</p>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          총 {reviews.length}개 리뷰 (진짜 리뷰{" "}
          {reviews.filter((r) => !r.isAd).length}개)
        </span>
        <button
          onClick={() => setShowAds(!showAds)}
          className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-gray-50"
        >
          {showAds ? "진짜 리뷰만 보기" : "전체 보기"}
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-400">
          리뷰를 분석하고 있습니다...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {displayedReviews.map((review, index) => (
          <ReviewCard key={index} review={review} />
        ))}
        {!isLoading && displayedReviews.length === 0 && !error && (
          <p className="py-12 text-center text-gray-400">
            표시할 리뷰가 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
