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
  postdate: string;
  adScore: number; // 0~100, 높을수록 광고 가능성 높음
  isAd: boolean;
  matchedKeywords: string[];
}
