import { FilteredReview } from "@/types";
import FilterBadge from "./FilterBadge";

interface ReviewCardProps {
  review: FilteredReview;
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rounded ? "text-yellow-400" : "text-gray-300"}>
        &#9733;
      </span>
    );
  }
  return <span className="text-sm">{stars}</span>;
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return "bg-green-100 text-green-700";
  if (rating >= 3) return "bg-yellow-100 text-yellow-700";
  if (rating >= 2) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const displayRating = review.calibratedRating;
  const wasCalibrated = review.calibratedRating !== review.rating;

  return (
    <a
      href={review.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 font-semibold text-gray-900">{review.title}</h4>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRatingColor(displayRating)}`}>
            {displayRating}점
          </span>
          <FilterBadge adScore={review.adScore} isAd={review.isAd} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <StarRating rating={displayRating} />
        {wasCalibrated && (
          <span className="text-xs text-gray-400" title="블로거 성향 기반 보정 점수">
            (원본 {review.rating}점)
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {review.description}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{review.bloggername}</span>
        <span>
          {review.postdate.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")}
        </span>
      </div>
      {review.isAd && review.matchedKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {review.matchedKeywords.map((kw) => (
            <span
              key={kw}
              className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-400"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
