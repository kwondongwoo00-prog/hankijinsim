import { NaverBlogItem, FilteredReview } from "@/types";

// 광고성 키워드와 가중치
const AD_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "체험단", weight: 30 },
  { keyword: "협찬", weight: 30 },
  { keyword: "제공받", weight: 25 },
  { keyword: "원고료", weight: 30 },
  { keyword: "#광고", weight: 35 },
  { keyword: "광고", weight: 15 },
  { keyword: "소정의", weight: 20 },
  { keyword: "무료로 제공", weight: 25 },
  { keyword: "대가를 받", weight: 25 },
  { keyword: "업체로부터", weight: 20 },
  { keyword: "지원받", weight: 20 },
  { keyword: "초대받", weight: 15 },
  { keyword: "방문체험", weight: 25 },
  { keyword: "맛집탐방단", weight: 25 },
  { keyword: "서포터즈", weight: 20 },
  { keyword: "기자단", weight: 20 },
];

const AD_SCORE_THRESHOLD = 40;

/**
 * 블로그 텍스트에서 광고 키워드를 검사하고 점수를 계산합니다.
 */
function calculateAdScore(text: string): {
  score: number;
  matchedKeywords: string[];
} {
  const lowerText = text.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const { keyword, weight } of AD_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += weight;
      matchedKeywords.push(keyword);
    }
  }

  // 점수를 0~100 범위로 제한
  return {
    score: Math.min(score, 100),
    matchedKeywords,
  };
}

/**
 * 네이버 블로그 검색 결과를 필터링하여 광고 점수와 함께 반환합니다.
 */
export function filterReviews(items: NaverBlogItem[]): FilteredReview[] {
  return items
    .map((item) => {
      const combinedText = `${item.title} ${item.description}`;
      const { score, matchedKeywords } = calculateAdScore(combinedText);

      return {
        title: item.title.replace(/<[^>]*>/g, ""), // HTML 태그 제거
        link: item.link,
        description: item.description.replace(/<[^>]*>/g, ""),
        bloggername: item.bloggername,
        postdate: item.postdate,
        adScore: score,
        isAd: score >= AD_SCORE_THRESHOLD,
        matchedKeywords,
      };
    })
    .sort((a, b) => a.adScore - b.adScore); // 광고 점수 낮은 순 (진짜 리뷰 우선)
}

export { AD_SCORE_THRESHOLD };
