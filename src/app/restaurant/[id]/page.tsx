"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReviewCard from "@/components/ReviewCard";
import { FilteredReview, SentimentSummary } from "@/types";

function ScoreBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 shrink-0 text-right text-gray-500">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-gray-100">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-medium text-gray-700">{rate}%</span>
    </div>
  );
}

function RatingDistribution({ distribution, total }: { distribution: number[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-6 shrink-0 text-right text-gray-500">{star}점</span>
            <div className="h-2 flex-1 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-yellow-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-gray-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push(<span key={`f${i}`} className="text-yellow-400">&#9733;</span>);
  }
  if (hasHalf) {
    stars.push(<span key="h" className="text-yellow-300">&#9733;</span>);
  }
  for (let i = stars.length; i < 5; i++) {
    stars.push(<span key={`e${i}`} className="text-gray-300">&#9733;</span>);
  }

  return <span className="text-2xl">{stars}</span>;
}

function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "맛집 확정!";
  if (rating >= 3.8) return "맛집 인정";
  if (rating >= 3.0) return "괜찮은 곳";
  if (rating >= 2.3) return "호불호 갈림";
  if (rating >= 1.5) return "평가 낮음";
  return "비추천";
}

function getRatingColor(rating: number): string {
  if (rating >= 3.8) return "text-green-600";
  if (rating >= 3.0) return "text-orange-500";
  if (rating >= 2.3) return "text-yellow-600";
  return "text-red-500";
}

export default function RestaurantPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<FilteredReview[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSummary | null>(null);
  const [irrelevantCount, setIrrelevantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAds, setShowAds] = useState(false);
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  const restaurantName = decodeURIComponent(params.id as string);
  const address = searchParams.get("address") || undefined;

  useEffect(() => {
    async function fetchReviews() {
      try {
        const queryParams = new URLSearchParams({
          query: restaurantName,
        });
        if (address) {
          queryParams.set("address", address);
        }

        const res = await fetch(`/api/reviews?${queryParams}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "리뷰를 불러오지 못했습니다.");
        }

        setReviews(data.reviews);
        setSentiment(data.sentiment);
        setIrrelevantCount(data.irrelevantCount ?? 0);
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
  }, [restaurantName, address]);

  const displayedReviews = reviews.filter((r) => {
    if (!showAds && r.isAd) return false;
    if (!showIrrelevant && !r.isRelevant) return false;
    return true;
  });

  const realReviewCount = reviews.filter((r) => !r.isAd && r.isRelevant).length;

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

      {/* 감성 분석 요약 카드 */}
      {sentiment && sentiment.total > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">리뷰 감성 분석</h2>
              <p className="mt-0.5 text-xs text-gray-400">블로거 성향 보정 적용</p>
            </div>
            <div className="text-right">
              <StarDisplay rating={sentiment.averageRating} />
              <p className={`text-2xl font-bold ${getRatingColor(sentiment.averageRating)}`}>
                {sentiment.averageRating}점
              </p>
              <p className={`text-sm ${getRatingColor(sentiment.averageRating)}`}>
                {getRatingLabel(sentiment.averageRating)}
              </p>
            </div>
          </div>

          {/* 별점 분포 */}
          <div className="mb-4">
            <RatingDistribution
              distribution={sentiment.ratingDistribution}
              total={sentiment.total}
            />
          </div>

          {/* 긍정/중립/부정 비율 바 */}
          <div className="space-y-2">
            <ScoreBar label="긍정" rate={sentiment.positiveRate} color="bg-green-400" />
            <ScoreBar label="중립" rate={sentiment.neutralRate} color="bg-gray-300" />
            <ScoreBar label="부정" rate={sentiment.negativeRate} color="bg-red-400" />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            광고/비관련 제외 {sentiment.total}개 리뷰 기반 (긍정 {sentiment.positive} / 중립 {sentiment.neutral} / 부정 {sentiment.negative})
          </p>
          {irrelevantCount > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              관련 없는 글 {irrelevantCount}개 제외됨
            </p>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-500">
          총 {reviews.length}개 리뷰 (진짜 리뷰 {realReviewCount}개)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setShowIrrelevant(!showIrrelevant)}
            className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-gray-50"
          >
            {showIrrelevant ? "관련 리뷰만" : "비관련 포함"}
          </button>
          <button
            onClick={() => setShowAds(!showAds)}
            className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-gray-50"
          >
            {showAds ? "진짜 리뷰만 보기" : "광고 포함"}
          </button>
        </div>
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
