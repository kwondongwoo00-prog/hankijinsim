import { NaverBlogItem, NaverSearchResponse } from "@/types";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

/**
 * 네이버 블로그 검색 API 단일 호출
 */
async function fetchPage(
  query: string,
  display: number,
  start: number
): Promise<NaverSearchResponse> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error("네이버 API 키가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    query,
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

/**
 * 식당명과 주소를 기반으로 최적화된 검색 쿼리를 생성합니다.
 */
/**
 * 검색 쿼리를 생성합니다.
 * 식당명을 따옴표로 감싸 정확한 구문 검색을 강제합니다.
 * (네이버가 복합어를 분해하여 엉뚱한 결과를 반환하는 것을 방지)
 * 관련 없는 결과는 relevance.ts에서 필터링합니다.
 */
function buildSearchQuery(name: string, address?: string): string {
  const isShortName = name.length <= 3;
  const quotedName = `"${name}"`;

  if (address && isShortName) {
    const dongMatch = address.match(/(\S+[동구])/);
    const locality = dongMatch ? dongMatch[1] : "";
    if (locality) {
      return `${quotedName} ${locality} 리뷰`;
    }
  }

  return `${quotedName} 리뷰`;
}

/**
 * 네이버 블로그 검색 API를 여러 번 호출하여 최대 500개 리뷰를 가져옵니다.
 */
export async function searchBlogReviews(
  name: string,
  maxResults: number = 300,
  address?: string
): Promise<NaverSearchResponse> {
  const query = buildSearchQuery(name, address);
  const pageSize = 100;
  const pages = Math.ceil(maxResults / pageSize);
  const allItems: NaverBlogItem[] = [];

  // 동시에 여러 페이지 요청
  const requests = [];
  for (let i = 0; i < pages; i++) {
    const start = i * pageSize + 1;
    if (start > 1000) break; // 네이버 API 최대 start = 1000
    requests.push(fetchPage(query, pageSize, start));
  }

  const results = await Promise.all(requests);

  let total = 0;
  for (const result of results) {
    total = result.total;
    allItems.push(...result.items);
  }

  return {
    lastBuildDate: results[0]?.lastBuildDate ?? "",
    total,
    start: 1,
    display: allItems.length,
    items: allItems,
  };
}
