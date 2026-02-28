import { NextRequest, NextResponse } from "next/server";
import { searchRestaurants } from "@/lib/kakao";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const page = searchParams.get("page") || "1";

  if (!query) {
    return NextResponse.json(
      { error: "검색어를 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const data = await searchRestaurants(query, Number(page));
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
