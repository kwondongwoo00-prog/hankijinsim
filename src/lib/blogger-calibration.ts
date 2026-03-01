/**
 * 블로거 캘리브레이션 시스템
 *
 * 블로거의 과거 맛집 리뷰를 분석하여 점수 성향(후한지/짠지)을 파악하고,
 * 이를 기반으로 개별 리뷰 점수를 보정합니다.
 *
 * 원리: 평균 5점 주는 블로거의 5점 < 평균 3점 주는 블로거의 5점
 */

import { FilteredReview, NaverSearchResponse } from "@/types";
import { analyzeReviewSentiment } from "@/lib/sentiment";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

/** 전역 평균 (1~5 스케일의 중앙값) */
const GLOBAL_MEAN = 3.0;

/** 보정 감쇠 계수 (1.0이면 전부 보정, 0이면 보정 안 함) */
const DAMPING = 0.6;

/** 캘리브레이션에 필요한 최소 과거 리뷰 수 */
const MIN_REVIEWS = 2;

interface BloggerProfile {
  bloggerlink: string;
  averageRating: number;
  reviewCount: number;
}

/**
 * 네이버 블로그 검색으로 특정 블로거의 다른 맛집 리뷰를 찾습니다.
 */
async function searchBloggerHistory(
  bloggerName: string
): Promise<NaverSearchResponse | null> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return null;

  try {
    const params = new URLSearchParams({
      query: `${bloggerName} 맛집 리뷰`,
      display: "30",
      start: "1",
      sort: "date",
    });

    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * 블로거의 과거 리뷰를 분석하여 프로필(평균 성향)을 생성합니다.
 */
async function buildBloggerProfile(
  bloggerName: string,
  bloggerlink: string
): Promise<BloggerProfile> {
  const defaultProfile: BloggerProfile = {
    bloggerlink,
    averageRating: GLOBAL_MEAN,
    reviewCount: 0,
  };

  const data = await searchBloggerHistory(bloggerName);
  if (!data) return defaultProfile;

  // bloggerlink로 정확히 같은 블로거의 글만 필터링
  const bloggerPosts = data.items.filter(
    (item) => item.bloggerlink === bloggerlink
  );

  if (bloggerPosts.length < MIN_REVIEWS) return defaultProfile;

  // 과거 리뷰들의 감성 분석
  let ratingSum = 0;
  for (const post of bloggerPosts) {
    const text = `${post.title} ${post.description}`.replace(/<[^>]*>/g, "");
    const { rating } = analyzeReviewSentiment(text);
    ratingSum += rating;
  }

  return {
    bloggerlink,
    averageRating: ratingSum / bloggerPosts.length,
    reviewCount: bloggerPosts.length,
  };
}

/**
 * 블로거 성향을 반영하여 개별 점수를 보정합니다.
 *
 * 공식: calibrated = raw + (글로벌평균 - 블로거평균) × 감쇠 × 신뢰도
 * - 후한 블로거(평균 높음) → 점수 하향 보정
 * - 짠 블로거(평균 낮음) → 점수 상향 보정
 * - 데이터 적으면 보정 약하게 (신뢰도 낮음)
 */
function calibrateRating(
  rawRating: number,
  bloggerAvg: number,
  reviewCount: number
): number {
  if (reviewCount < MIN_REVIEWS) return rawRating;

  // 신뢰도: 과거 리뷰 5개면 100%, 2개면 40%
  const confidence = Math.min(1.0, reviewCount / 5);
  const shift = (GLOBAL_MEAN - bloggerAvg) * DAMPING * confidence;
  const calibrated = rawRating + shift;

  return Math.round(Math.max(1, Math.min(5, calibrated)) * 10) / 10;
}

/** 캘리브레이션 대상 최대 블로거 수 */
const MAX_BLOGGERS = 20;

/** 동시 API 호출 배치 크기 */
const BATCH_SIZE = 10;

/**
 * 전체 리뷰에 블로거 캘리브레이션을 적용합니다.
 * 관련성 상위 블로거만 대상으로 하고, 배치 병렬 처리로 속도를 최적화합니다.
 */
export async function calibrateReviews(
  reviews: FilteredReview[]
): Promise<FilteredReview[]> {
  // 유니크 블로거 추출 (광고/비관련 제외)
  const bloggerMap = new Map<string, { name: string; maxRelevance: number }>();
  for (const review of reviews) {
    if (!review.isAd && review.isRelevant) {
      const existing = bloggerMap.get(review.bloggerlink);
      if (!existing || review.relevanceScore > existing.maxRelevance) {
        bloggerMap.set(review.bloggerlink, {
          name: review.bloggername,
          maxRelevance: review.relevanceScore,
        });
      }
    }
  }

  // 관련성 높은 상위 N명만 선택
  const topBloggers = Array.from(bloggerMap.entries())
    .sort((a, b) => b[1].maxRelevance - a[1].maxRelevance)
    .slice(0, MAX_BLOGGERS);

  // 배치 병렬 처리 (한 번에 BATCH_SIZE개씩)
  const profiles = new Map<string, BloggerProfile>();
  for (let i = 0; i < topBloggers.length; i += BATCH_SIZE) {
    const batch = topBloggers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([link, { name }]) => {
        const profile = await buildBloggerProfile(name, link);
        return [link, profile] as const;
      })
    );
    for (const [link, profile] of results) {
      profiles.set(link, profile);
    }
  }

  // 각 리뷰에 보정 점수 적용
  return reviews.map((review) => {
    const profile = profiles.get(review.bloggerlink);
    if (!profile || profile.reviewCount < MIN_REVIEWS) {
      return review;
    }

    return {
      ...review,
      calibratedRating: calibrateRating(
        review.rating,
        profile.averageRating,
        profile.reviewCount,
      ),
    };
  });
}
