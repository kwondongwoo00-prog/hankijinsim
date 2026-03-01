/**
 * 관련성 필터링 시스템
 * 식당/음식 리뷰와 관련 없는 블로그 글을 제외합니다.
 */

// 식당/음식 키워드 (양수 가중치)
const FOOD_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "맛집", weight: 15 },
  { keyword: "메뉴", weight: 10 },
  { keyword: "음식", weight: 10 },
  { keyword: "요리", weight: 10 },
  { keyword: "반찬", weight: 10 },
  { keyword: "국물", weight: 10 },
  { keyword: "고기", weight: 8 },
  { keyword: "디저트", weight: 8 },
  { keyword: "커피", weight: 5 },
  { keyword: "음료", weight: 5 },
  { keyword: "밥", weight: 5 },
  { keyword: "면", weight: 3 },
  { keyword: "찌개", weight: 10 },
  { keyword: "탕", weight: 5 },
  { keyword: "볶음", weight: 8 },
  { keyword: "구이", weight: 8 },
  { keyword: "튀김", weight: 8 },
  { keyword: "회", weight: 5 },
  { keyword: "초밥", weight: 10 },
  { keyword: "파스타", weight: 10 },
  { keyword: "피자", weight: 10 },
  { keyword: "햄버거", weight: 10 },
  { keyword: "치킨", weight: 8 },
  { keyword: "떡볶이", weight: 10 },
  { keyword: "김치", weight: 5 },
  { keyword: "샐러드", weight: 8 },
  { keyword: "빵", weight: 5 },
  { keyword: "케이크", weight: 8 },
  { keyword: "맛있", weight: 10 },
  { keyword: "맛없", weight: 10 },
  { keyword: "맛이", weight: 8 },
  { keyword: "맛은", weight: 8 },
  { keyword: "맛도", weight: 8 },
  { keyword: "간이", weight: 5 },
  { keyword: "양이", weight: 5 },
  { keyword: "소스", weight: 5 },
  { keyword: "재료", weight: 5 },
  { keyword: "식감", weight: 10 },
  { keyword: "풍미", weight: 8 },
  { keyword: "조리", weight: 5 },
  { keyword: "세트", weight: 3 },
  { keyword: "런치", weight: 8 },
  { keyword: "디너", weight: 8 },
  { keyword: "브런치", weight: 8 },
  { keyword: "코스", weight: 5 },
];

// 방문/체험 키워드 (양수 가중치)
const VISIT_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "방문", weight: 10 },
  { keyword: "다녀왔", weight: 12 },
  { keyword: "다녀온", weight: 12 },
  { keyword: "먹었", weight: 10 },
  { keyword: "먹어봤", weight: 10 },
  { keyword: "먹어본", weight: 10 },
  { keyword: "먹으러", weight: 10 },
  { keyword: "주문", weight: 8 },
  { keyword: "포장", weight: 8 },
  { keyword: "배달", weight: 8 },
  { keyword: "매장", weight: 8 },
  { keyword: "식당", weight: 10 },
  { keyword: "가게", weight: 8 },
  { keyword: "입장", weight: 5 },
  { keyword: "착석", weight: 5 },
  { keyword: "웨이팅", weight: 10 },
  { keyword: "대기", weight: 5 },
  { keyword: "예약", weight: 8 },
  { keyword: "오픈", weight: 5 },
  { keyword: "영업", weight: 5 },
  { keyword: "재방문", weight: 12 },
  { keyword: "단골", weight: 12 },
  { keyword: "리뷰", weight: 5 },
  { keyword: "후기", weight: 8 },
  { keyword: "솔직", weight: 5 },
  { keyword: "가격", weight: 5 },
  { keyword: "계산", weight: 3 },
  { keyword: "서빙", weight: 8 },
  { keyword: "직원", weight: 5 },
  { keyword: "사장님", weight: 8 },
  { keyword: "인분", weight: 8 },
  { keyword: "테이블", weight: 5 },
  { keyword: "좌석", weight: 5 },
  { keyword: "카운터", weight: 3 },
];

// 비관련 키워드 (음수 가중치)
const IRRELEVANT_KEYWORDS: { keyword: string; weight: number }[] = [
  { keyword: "화장품", weight: -20 },
  { keyword: "영화", weight: -15 },
  { keyword: "게임", weight: -20 },
  { keyword: "부동산", weight: -25 },
  { keyword: "소프트웨어", weight: -25 },
  { keyword: "주식", weight: -15 },
  { keyword: "코인", weight: -20 },
  { keyword: "보험", weight: -20 },
  { keyword: "대출", weight: -25 },
  { keyword: "투자", weight: -15 },
  { keyword: "아파트", weight: -20 },
  { keyword: "분양", weight: -25 },
  { keyword: "성형", weight: -20 },
  { keyword: "시술", weight: -15 },
  { keyword: "병원", weight: -10 },
  { keyword: "학원", weight: -15 },
  { keyword: "과외", weight: -15 },
  { keyword: "쇼핑몰", weight: -10 },
  { keyword: "의류", weight: -15 },
  { keyword: "패션", weight: -10 },
  { keyword: "자동차", weight: -15 },
  { keyword: "헬스", weight: -10 },
  { keyword: "운동", weight: -5 },
  { keyword: "여행", weight: -5 },
  { keyword: "호텔", weight: -5 },
  { keyword: "숙소", weight: -5 },
  { keyword: "펜션", weight: -5 },
];

const RELEVANCE_THRESHOLD = 40;

// 한국어 외래어 표기 변형 매핑 (바베큐/바비큐, 케이크/케잌 등)
const TRANSLITERATION_VARIANTS: [string, string][] = [
  ["베", "비"],
  ["비", "베"],
  ["큐", "쿠"],
  ["쿠", "큐"],
  ["케", "게"],
  ["게", "케"],
  ["에", "이"],
];

// 한국어 조사 패턴 (식당명 바로 뒤에 올 수 있는 것들)
const KOREAN_PARTICLES =
  "은|는|이|가|을|를|에|의|도|과|와|로|으로|에서|까지|부터|만|요|야|입니다|이다|인|인데|이라|이랑|하고|처럼|보다|밖에|마저|조차|든지|이나|랑|며|고";

/**
 * 식당명의 한국어 외래어 표기 변형을 생성합니다.
 * "바베큐파크" → ["바베큐파크", "바비큐파크"] 등
 */
function generateNameVariants(name: string): string[] {
  const variants = new Set<string>();
  const lower = name.toLowerCase();
  const noSpace = lower.replace(/\s/g, "");
  variants.add(noSpace);

  // 외래어 표기 변형 생성
  for (const [from, to] of TRANSLITERATION_VARIANTS) {
    if (noSpace.includes(from)) {
      variants.add(noSpace.replace(new RegExp(from, "g"), to));
    }
  }

  return [...variants];
}

/**
 * 텍스트에서 식당명(변형 포함)이 존재하는지 확인합니다.
 * 이름 사이의 공백을 허용하되, 이름 뒤에 다른 단어가 이어지는 경우는 제외합니다.
 * 예: "바베큐 파크" ✓, "바베큐파크에서" ✓, "바베큐 파크오브드림" ✗
 */
function nameExistsInText(text: string, variants: string[]): boolean {
  for (const variant of variants) {
    // 글자 사이에 선택적 공백을 허용하되, 이름 끝 뒤에 경계 확인
    // "바베큐파크" → /바\s?베\s?큐\s?파\s?크(?=$|[\s,.!?)~\-♥·]|은|는|이|가|...)/
    const chars = [...variant];
    const pattern = chars
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s?");
    const boundary = `(?=$|[\\s,.!?)~\\-♥·:;''""\`\\/|\\]\\[\\(\\{\\}#@&]|${KOREAN_PARTICLES})`;
    const regex = new RegExp(pattern + boundary, "i");
    if (regex.test(text)) return true;
  }
  return false;
}

export interface RelevanceResult {
  relevanceScore: number;
  isRelevant: boolean;
}

/**
 * 블로그 글의 식당 리뷰 관련성을 평가합니다.
 * @param text - 분석할 텍스트 (title + description)
 * @param restaurantName - 검색한 식당 이름
 * @param bloggerName - 블로거 이름
 * @returns 관련성 점수 (0~100)와 관련 여부
 */
export function calculateRelevance(
  text: string,
  restaurantName: string,
  bloggerName: string
): RelevanceResult {
  const lowerText = text.toLowerCase();
  let score = 0;

  // 식당명이 텍스트에 포함되면 강한 관련성 신호
  // 단, 블로거 이름이 식당명을 포함하면 카운트하지 않음
  // 외래어 표기 변형 + 공백 허용 + 경계 확인
  const bloggerContainsName = bloggerName.includes(restaurantName);
  const nameVariants = generateNameVariants(restaurantName);
  const nameFound =
    !bloggerContainsName && nameExistsInText(lowerText, nameVariants);
  if (nameFound) {
    score += 30;
  } else {
    // 식당명이 없으면 페널티: 음식 키워드만으로는 쉽게 통과 못하게
    score -= 15;
  }

  // 식당/음식 키워드 매칭
  for (const { keyword, weight } of FOOD_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += weight;
    }
  }

  // 방문/체험 키워드 매칭
  for (const { keyword, weight } of VISIT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += weight;
    }
  }

  // 비관련 키워드 매칭
  for (const { keyword, weight } of IRRELEVANT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      score += weight; // weight is negative
    }
  }

  // 0~100 범위로 클램핑
  const clampedScore = Math.max(0, Math.min(100, score));

  return {
    relevanceScore: clampedScore,
    isRelevant: clampedScore >= RELEVANCE_THRESHOLD,
  };
}

export { RELEVANCE_THRESHOLD };
