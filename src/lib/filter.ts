import { NaverBlogItem, FilteredReview } from "@/types";
import { analyzeReviewSentiment } from "@/lib/sentiment";
import { calculateRelevance } from "@/lib/relevance";
import { fetchBlogContents } from "@/lib/blog-scraper";

// 확정 광고 키워드: 하나만 매칭돼도 즉시 광고 판정
const DEFINITIVE_AD_KEYWORDS = [
  "협찬",
  "체험단",
  "원고료",
  "원고비",
  "#광고",
  "광고임을",
  "광고입니다",
  "유료광고",
  "유료 광고",
  "경제적 대가",
  "대가를 받",
  "대가성",
  "소정의 원고료",
  "제공받아 작성",
  "제공받았습니다",
  "제공받아 리뷰",
  "뒷광고",
  "리뷰단",
];

// 누적 광고 키워드: 점수 합산으로 판단
const AD_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "광고", weight: 15 },
  { keyword: "제공받", weight: 30 },
  { keyword: "제공 받", weight: 30 },
  { keyword: "소정의", weight: 20 },
  { keyword: "무료로 제공", weight: 25 },
  { keyword: "무상 제공", weight: 25 },
  { keyword: "무상으로", weight: 20 },
  { keyword: "업체로부터", weight: 20 },
  { keyword: "업체 측", weight: 15 },
  { keyword: "업체측", weight: 15 },
  { keyword: "업체에서 제공", weight: 25 },
  { keyword: "지원받", weight: 20 },
  { keyword: "지원 받", weight: 20 },
  { keyword: "초대받", weight: 15 },
  { keyword: "초대 받", weight: 15 },
  { keyword: "초청받", weight: 20 },
  { keyword: "초청 받", weight: 20 },
  { keyword: "방문체험", weight: 25 },
  { keyword: "맛집탐방단", weight: 25 },
  { keyword: "서포터즈", weight: 20 },
  { keyword: "기자단", weight: 20 },
  { keyword: "제휴", weight: 15 },
  { keyword: "후원", weight: 15 },
  { keyword: "식사 제공", weight: 20 },
  { keyword: "식사를 제공", weight: 20 },
  { keyword: "파워블로거", weight: 15 },
  { keyword: "본 포스팅은", weight: 10 },
  { keyword: "본 게시글은", weight: 10 },
  { keyword: "제공해 주셔서", weight: 20 },
  { keyword: "제공해주셔서", weight: 20 },
  { keyword: "소비자 체험", weight: 20 },
  { keyword: "리뷰어", weight: 15 },
];

// 은근 광고 신호: 명시적이진 않지만 마케팅 캠페인 가능성
const SOFT_AD_SIGNALS: { keyword: string; weight: number }[] = [
  { keyword: "오픈 초대", weight: 20 },
  { keyword: "오픈초대", weight: 20 },
  { keyword: "그랜드 오픈", weight: 15 },
  { keyword: "시식회", weight: 20 },
  { keyword: "시식 초대", weight: 20 },
  { keyword: "미디어 데이", weight: 20 },
  { keyword: "미디어데이", weight: 20 },
  { keyword: "블로거 초대", weight: 20 },
  { keyword: "블로거 모집", weight: 20 },
  { keyword: "블로거모집", weight: 20 },
  { keyword: "인플루언서", weight: 15 },
  { keyword: "sns 서포터즈", weight: 20 },
  { keyword: "방문 이벤트", weight: 15 },
  { keyword: "무료 시식", weight: 20 },
  { keyword: "무료시식", weight: 20 },
  { keyword: "프레스 런치", weight: 20 },
];

// 반(反)광고 키워드: 직접 결제했다는 신호 → 점수 차감
const ANTI_AD_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "내돈내산", weight: -20 },
  { keyword: "내 돈 내산", weight: -20 },
  { keyword: "자비로", weight: -15 },
  { keyword: "직접 결제", weight: -15 },
  { keyword: "제 돈으로", weight: -15 },
];

const AD_SCORE_THRESHOLD = 30;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * 블로그 텍스트에서 광고 여부를 판별합니다.
 * 확정 키워드 1개 매칭 = 즉시 광고, 누적 키워드 합산 >= 임계값 = 광고
 */
function calculateAdScore(text: string): {
  score: number;
  matchedKeywords: string[];
  isDefinitiveAd: boolean;
} {
  const lowerText = text.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];
  let isDefinitiveAd = false;

  // 1. 확정 광고 키워드 체크 (하나라도 매칭되면 즉시 광고)
  for (const keyword of DEFINITIVE_AD_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      isDefinitiveAd = true;
      matchedKeywords.push(keyword);
      score = 100;
    }
  }

  // 2. 누적 광고 키워드 점수
  if (!isDefinitiveAd) {
    for (const { keyword, weight } of AD_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += weight;
        matchedKeywords.push(keyword);
      }
    }

    // 3. 은근 광고 신호
    for (const { keyword, weight } of SOFT_AD_SIGNALS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += weight;
        matchedKeywords.push(keyword);
      }
    }

    // 4. 반광고 키워드 차감
    for (const { keyword, weight } of ANTI_AD_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += weight; // weight is negative
      }
    }
  }

  return {
    score: Math.max(0, Math.min(score, 100)),
    matchedKeywords,
    isDefinitiveAd,
  };
}

/**
 * 네이버 블로그 검색 결과를 필터링하여 광고 점수, 관련성, 별점과 함께 반환합니다.
 * 블로그 본문을 크롤링하여 분석 정확도를 높입니다.
 */
export async function filterReviews(
  items: NaverBlogItem[],
  restaurantName: string
): Promise<FilteredReview[]> {
  // 1. HTML 태그 제거
  const cleaned = items.map((item) => ({
    ...item,
    title: stripHtml(item.title),
    description: stripHtml(item.description),
  }));

  // 2. 링크 기반 중복 제거
  const seen = new Set<string>();
  const deduped = cleaned.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // 3. 블로그 본문 크롤링 (최대 100개, 병렬 8개)
  //    300개 전부 크롤링하면 너무 느리므로 상위 100개만 크롤링
  //    나머지는 title+description 폴백 사용
  const MAX_SCRAPE = 100;
  const blogUrls = deduped.slice(0, MAX_SCRAPE).map((item) => item.link);
  const blogContents = await fetchBlogContents(blogUrls, 8);

  // 4. 각 리뷰에 광고 점수, 관련성, 감성 분석 적용
  const results: FilteredReview[] = deduped.map((item) => {
    // 본문이 있으면 본문 사용, 없으면 title+description 폴백
    const fullText = blogContents.get(item.link);
    const analysisText = fullText
      ? `${item.title} ${fullText}`
      : `${item.title} ${item.description}`;

    // 관련성은 title+description으로 판단 (본문은 너무 길어 노이즈 가능)
    const relevanceText = `${item.title} ${item.description}`;

    const { score: adScore, matchedKeywords, isDefinitiveAd } =
      calculateAdScore(analysisText);

    const { relevanceScore, isRelevant } = calculateRelevance(
      relevanceText,
      restaurantName,
      item.bloggername
    );

    const { sentiment, rating, matchCount } =
      analyzeReviewSentiment(analysisText);

    return {
      title: item.title,
      link: item.link,
      description: item.description,
      bloggername: item.bloggername,
      bloggerlink: item.bloggerlink,
      postdate: item.postdate,
      adScore,
      isAd: isDefinitiveAd || adScore >= AD_SCORE_THRESHOLD,
      matchedKeywords,
      sentiment,
      rating,
      calibratedRating: rating,
      matchCount,
      relevanceScore,
      isRelevant,
    };
  });

  return results.sort((a, b) => a.adScore - b.adScore);
}

export { AD_SCORE_THRESHOLD };
