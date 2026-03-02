// 카카오 로컬 API 장소 검색 결과
export interface Restaurant {
  id: string;
  place_name: string;
  category_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  place_url: string;
}

export interface KakaoSearchResponse {
  documents: Restaurant[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

// 네이버 블로그 검색 결과
export interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

export interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBlogItem[];
}

// 필터링된 리뷰
export interface FilteredReview {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
  adScore: number; // 0~100, 높을수록 광고 가능성 높음
  isAd: boolean;
  matchedKeywords: string[];
  sentiment: "positive" | "negative" | "neutral";
  rating: number; // 1~5점 (원본)
  calibratedRating: number; // 1~5점 (블로거 성향 보정)
  matchCount: number; // 감성 키워드 매칭 수 (0~1이면 판단 불가)
  relevanceScore: number; // 0~100
  isRelevant: boolean;
}

// 감성 분석 요약
export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveRate: number;
  negativeRate: number;
  neutralRate: number;
  score: number;
  grade: string; // 맛집 확정 / 맛집 인정 / 괜찮은 곳 / 호불호 갈림 / 평가 낮음 / 비추천
  averageRating: number; // 1~5 보정 평균 별점
  ratingDistribution: number[]; // [1점수, 2점수, 3점수, 4점수, 5점수]
}
