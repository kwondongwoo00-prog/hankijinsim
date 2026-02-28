interface FilterBadgeProps {
  adScore: number;
  isAd: boolean;
}

export default function FilterBadge({ adScore, isAd }: FilterBadgeProps) {
  if (isAd) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        광고 의심 {adScore}%
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      진짜 리뷰
    </span>
  );
}
