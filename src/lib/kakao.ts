import { KakaoSearchResponse } from "@/types";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

/**
 * 카카오 로컬 API로 음식점을 키워드 검색합니다. (서버 사이드 전용)
 */
export async function searchRestaurants(
  query: string,
  page: number = 1,
  size: number = 15
): Promise<KakaoSearchResponse> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    query,
    category_group_code: "FD6", // 음식점 카테고리
    page: String(page),
    size: String(size),
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`카카오 API 오류: ${response.status}`);
  }

  return response.json();
}
