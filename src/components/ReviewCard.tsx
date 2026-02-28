import { FilteredReview } from "@/types";
import FilterBadge from "./FilterBadge";

interface ReviewCardProps {
  review: FilteredReview;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <a
      href={review.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 font-semibold text-gray-900">{review.title}</h4>
        <FilterBadge adScore={review.adScore} isAd={review.isAd} />
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
