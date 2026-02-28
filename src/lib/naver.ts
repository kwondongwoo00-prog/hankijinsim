import { NaverSearchResponse } from "@/types";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

/**
 * 네이버 블로그 검색 API로 식당 리뷰를 검색합니다. (서버 사이드 전용)
 */
export async function searchBlogReviews(
  query: string,
  display: number = 20,
  start: number = 1
): Promise<NaverSearchResponse> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    query: `${query} 리뷰`,
    display: String(display),
    start: String(start),
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

  if (!response.ok) {
    throw new Error(`네이버 API 오류: ${response.status}`);
  }

  return response.json();
}
