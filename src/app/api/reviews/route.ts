import { NextRequest, NextResponse } from "next/server";
import { searchBlogReviews } from "@/lib/naver";
import { filterReviews } from "@/lib/filter";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "식당 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const data = await searchBlogReviews(query);
    const filtered = filterReviews(data.items);
    return NextResponse.json({
      total: data.total,
      reviews: filtered,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "리뷰 검색 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
