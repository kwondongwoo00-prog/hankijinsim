import { NextRequest, NextResponse } from "next/server";
import { searchBlogReviews } from "@/lib/naver";
import { filterReviews } from "@/lib/filter";
import { analyzeSentimentSummary } from "@/lib/sentiment";
import { calibrateReviews } from "@/lib/blogger-calibration";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const address = searchParams.get("address") || undefined;

  if (!query) {
    return NextResponse.json(
      { error: "식당 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    // 1. 네이버 블로그 검색
    const data = await searchBlogReviews(query, 300, address);

    // 2. 필터링 (광고 탐지 + 관련성 + 감성 분석)
    const filtered = filterReviews(data.items, query);

    // 3. 블로거 캘리브레이션 (과거 리뷰 기반 점수 보정)
    const calibrated = await calibrateReviews(filtered);

    // 4. 감성 분석 요약 (보정 점수 기반)
    const sentiment = analyzeSentimentSummary(calibrated);

    const irrelevantCount = calibrated.filter((r) => !r.isRelevant).length;

    return NextResponse.json({
      total: data.total,
      reviews: calibrated,
      sentiment,
      irrelevantCount,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "리뷰 검색 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
