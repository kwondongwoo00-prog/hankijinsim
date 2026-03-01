import { FilteredReview } from "@/types";
import knuLexicon from "@/data/knu-lexicon.json";

// KNU 감성사전 로드 (Map으로 변환하여 빠른 조회)
const lexiconEntries = Object.entries(knuLexicon as Record<string, number>)
  .sort((a, b) => b[0].length - a[0].length); // 긴 키워드 우선 매칭

// 부정어 목록
// "안"/"못" 단독은 지명(안양, 안산)이나 복합어에서 오매칭되므로
// 공백 포함 버전("안 ", "못 ")만 사용
const NEGATION_WORDS = ["없", "아니", "안 ", "못 "];

// "아니고", "아니라", "아닌" 등은 "X가 아니라 Y다" 구문 → Y를 반전하면 안 됨
const NEGATION_CONJUNCTION_SUFFIXES = ["고", "라", "ㄴ", "야", "지"];

// 해소/제거 표현: 앞의 부정적 감성을 중화시키는 단어
const NEUTRALIZER_WORDS = [
  "가시게", "가셔", "없애", "잡아주", "잡아줘", "해소",
  "사라지", "사라져", "덜어", "줄여", "날려", "씻어",
  "잡아", "덜해", "안 느껴",
];

// 4개 축 분류를 위한 키워드
const TASTE_KEYWORDS = [
  "맛", "음식", "요리", "메뉴", "먹", "식감", "간", "양념", "소스",
  "달콤", "고소", "바삭", "쫄깃", "촉촉", "부드", "담백", "감칠",
  "신선", "풍미", "짜", "느끼", "비린", "텁텁", "눅눅", "퍽퍽",
  "질기", "싱겁", "쓴", "맵", "달", "새콤", "시큼", "진하",
  "존맛", "JMT", "jmt", "핵맛", "꿀맛", "노맛", "맛없", "맛있",
  "인생맛집", "레전드", "넘사벽", "미쳤", "대박",
];
const PRICE_KEYWORDS = [
  "가격", "가성비", "비싸", "비싼", "저렴", "싸", "합리", "착한 가격",
  "돈", "원", "만원", "천원", "바가지", "양심", "돈값", "돈 아깝",
];
const SERVICE_KEYWORDS = [
  "친절", "불친절", "서비스", "직원", "사장님", "서빙", "응대",
  "빠르", "느리", "늦", "오래 걸", "기다",
];
const ATMOSPHERE_KEYWORDS = [
  "분위기", "인테리어", "아늑", "깔끔", "깨끗", "더럽", "청결",
  "시끄", "조용", "좁", "넓", "예쁘", "이쁘", "감성", "세련",
  "아담", "아기자기", "어두", "밝", "편안", "포근",
];

// 축별 가중치
const AXIS_WEIGHTS = {
  taste: 0.45,
  price: 0.25,
  service: 0.20,
  atmosphere: 0.10,
};

type Axis = "taste" | "price" | "service" | "atmosphere";

function classifyAxis(word: string): Axis {
  const lower = word.toLowerCase();
  if (PRICE_KEYWORDS.some((k) => lower.includes(k) || k.includes(lower))) return "price";
  if (SERVICE_KEYWORDS.some((k) => lower.includes(k) || k.includes(lower))) return "service";
  if (ATMOSPHERE_KEYWORDS.some((k) => lower.includes(k) || k.includes(lower))) return "atmosphere";
  return "taste"; // 기본값: 맛
}

/**
 * 텍스트에서 부정어를 감지하고, 부정어 다음 2토큰 내 감성 점수를 반전합니다.
 * "아니고/아니라" 같은 접속 구문은 예외 처리합니다.
 */
function applyNegation(text: string, matchedWords: { word: string; score: number; index: number }[]) {
  // 1. 부정어 → 뒤의 감성 단어 반전
  for (const neg of NEGATION_WORDS) {
    let searchStart = 0;
    while (true) {
      const negIdx = text.indexOf(neg, searchStart);
      if (negIdx === -1) break;
      searchStart = negIdx + neg.length;

      // "아니고", "아니라", "아닌" 등 접속 구문이면 반전 스킵
      // "X 아니고 Y" → Y는 긍정 주장이므로 반전하면 안 됨
      if (neg === "아니") {
        const nextChar = text[negIdx + neg.length];
        if (nextChar && NEGATION_CONJUNCTION_SUFFIXES.includes(nextChar)) {
          continue;
        }
      }

      // 부정어 뒤 10자 이내의 감성 단어 점수 반전
      // (한국어 안/못 부정은 바로 뒤 단어에 적용 → 범위 좁게 유지)
      for (const match of matchedWords) {
        const distance = match.index - (negIdx + neg.length);
        if (distance >= 0 && distance <= 10) {
          match.score = -match.score;
        }
      }
    }
  }

  // 2. 해소/제거 표현 → 앞의 부정적 감성 단어 중화
  // "느끼함을 싹 가시게" → "느끼"(-1) 를 중화(0)
  for (const neutralizer of NEUTRALIZER_WORDS) {
    let searchStart = 0;
    while (true) {
      const nIdx = text.indexOf(neutralizer, searchStart);
      if (nIdx === -1) break;
      searchStart = nIdx + neutralizer.length;

      // 해소 표현 앞 25자 이내의 부정적 감성 단어를 중화
      for (const match of matchedWords) {
        const distance = nIdx - (match.index + match.word.length);
        if (distance >= 0 && distance <= 25 && match.score < 0) {
          match.score = 0; // 부정적 감성을 중립으로 중화
        }
      }
    }
  }
}

// 모든 축 키워드를 합친 리스트 (부정 단어의 맥락 판단용)
const ALL_AXIS_KEYWORDS = [
  ...TASTE_KEYWORDS, ...PRICE_KEYWORDS, ...SERVICE_KEYWORDS, ...ATMOSPHERE_KEYWORDS,
];

/**
 * 부정 단어의 맥락을 분석하여 거짓 부정을 중화합니다.
 * 1. 가정법 ~면: "부족하면 추가로 시키면 돼요" → 실제 불만 아님
 * 2. 가능성 ~ㄹ 수 있: "느끼할 수 있는데" → 가정, 실제 경험 아님
 * 3. 대조 해소 ~는데/~지만: "느끼한데 사이드가 잡아줘서" → 해소된 불만
 * 4. 축 무관 부정: 맛/서비스/분위기/가격과 관련 없으면 중화
 */
function applyContextFilters(
  text: string,
  matchedWords: { word: string; score: number; index: number; axis: Axis }[]
) {
  for (const match of matchedWords) {
    if (match.score >= 0) continue; // 긍정/중립은 스킵

    const afterStart = match.index + match.word.length;

    // 1. 가정법 ~면: 부정 단어 바로 뒤에 "면"이 오면 가정법
    const suffix = text.substring(afterStart, afterStart + 4);
    if (/^.{0,2}면/.test(suffix)) {
      match.score = 0;
      continue;
    }

    // 2. 가능성 "수 있": 부정 단어 뒤 20자 내에 "수 있"/"수가 있" 패턴
    const possibilityWindow = text.substring(afterStart, afterStart + 20);
    if (/수\s?있|수가\s?있/.test(possibilityWindow)) {
      match.score = 0;
      continue;
    }

    // 3. 대조 해소: 부정 뒤 25자 내 대조 접속사(는데/지만 등) + 그 뒤 긍정 단어
    const contrastWindow = text.substring(afterStart, afterStart + 25);
    const contrastMatch = contrastWindow.match(/(는데|ㄴ데|한데|은데|지만)/);
    if (contrastMatch && contrastMatch.index !== undefined) {
      const resolveStart = afterStart + contrastMatch.index + contrastMatch[0].length;
      const hasPositiveResolution = matchedWords.some(
        (m) => m.score > 0 && m.index >= resolveStart && m.index < resolveStart + 30
      );
      if (hasPositiveResolution) {
        match.score = 0;
        continue;
      }
    }

    // 4. 축 무관 부정: 부정 단어 자체가 축 키워드가 아니면, 근처에 축 키워드 필요
    const isAxisSpecific = ALL_AXIS_KEYWORDS.some(
      (k) => match.word.includes(k) || k.includes(match.word)
    );
    if (!isAxisSpecific) {
      const windowStart = Math.max(0, match.index - 30);
      const windowEnd = Math.min(text.length, afterStart + 30);
      const contextWindow = text.substring(windowStart, windowEnd);
      const hasAxisContext = ALL_AXIS_KEYWORDS.some((k) => contextWindow.includes(k));
      if (!hasAxisContext) {
        match.score = 0;
        continue;
      }
    }
  }
}

export type ReviewSentiment = "positive" | "negative" | "neutral";

export interface DetailedSentimentResult {
  sentiment: ReviewSentiment;
  sentimentScore: number; // -100 ~ +100
  rating: number; // 1~5
  matchCount: number; // 매칭된 감성 키워드 수
  axisScores: {
    taste: number;
    price: number;
    service: number;
    atmosphere: number;
  };
}

/**
 * 개별 리뷰의 감성을 분석하여 1~5점 레이팅을 포함한 결과를 반환합니다.
 */
export function analyzeReviewSentiment(text: string): DetailedSentimentResult {
  const lowerText = text.toLowerCase();

  // 사전에서 매칭되는 단어 찾기
  const matchedWords: { word: string; score: number; index: number; axis: Axis }[] = [];
  const matchedPositions = new Set<number>(); // 중복 매칭 방지

  for (const [word, score] of lexiconEntries) {
    let searchStart = 0;
    while (true) {
      const idx = lowerText.indexOf(word.toLowerCase(), searchStart);
      if (idx === -1) break;
      searchStart = idx + 1;

      // 이미 더 긴 키워드로 매칭된 위치인지 확인
      let overlapping = false;
      for (const pos of matchedPositions) {
        if (Math.abs(pos - idx) < word.length) {
          overlapping = true;
          break;
        }
      }

      if (!overlapping) {
        // 1글자 단어는 복합어 내부 매칭(거짓 양성) 방지
        // 예: "타"(-1)가 "브레이크타임"에서 매칭되는 것을 막음
        // 앞뒤 문자가 한글이면 복합어 일부로 판단하여 스킵
        if (word.length === 1) {
          const prevChar = idx > 0 ? lowerText.charCodeAt(idx - 1) : 0;
          const nextChar = idx + 1 < lowerText.length ? lowerText.charCodeAt(idx + 1) : 0;
          const prevIsKorean = prevChar >= 0xAC00 && prevChar <= 0xD7A3;
          const nextIsKorean = nextChar >= 0xAC00 && nextChar <= 0xD7A3;
          if (prevIsKorean || nextIsKorean) continue;
        }

        matchedPositions.add(idx);
        matchedWords.push({
          word,
          score,
          index: idx,
          axis: classifyAxis(word),
        });
      }
    }
  }

  // 부정어 처리
  applyNegation(lowerText, matchedWords);

  // 맥락 기반 거짓 부정 필터링
  applyContextFilters(lowerText, matchedWords);

  // 축별 점수 계산
  const axisScores: Record<Axis, { sum: number; count: number }> = {
    taste: { sum: 0, count: 0 },
    price: { sum: 0, count: 0 },
    service: { sum: 0, count: 0 },
    atmosphere: { sum: 0, count: 0 },
  };

  for (const match of matchedWords) {
    axisScores[match.axis].sum += match.score;
    axisScores[match.axis].count++;
  }

  // 축별 평균 (매칭 없으면 0)
  const axisAvg: Record<Axis, number> = {
    taste: axisScores.taste.count > 0 ? axisScores.taste.sum / axisScores.taste.count : 0,
    price: axisScores.price.count > 0 ? axisScores.price.sum / axisScores.price.count : 0,
    service: axisScores.service.count > 0 ? axisScores.service.sum / axisScores.service.count : 0,
    atmosphere: axisScores.atmosphere.count > 0 ? axisScores.atmosphere.sum / axisScores.atmosphere.count : 0,
  };

  // 가중 평균 (매칭된 축만 포함)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const axis of ["taste", "price", "service", "atmosphere"] as Axis[]) {
    if (axisScores[axis].count > 0) {
      weightedSum += axisAvg[axis] * AXIS_WEIGHTS[axis];
      weightTotal += AXIS_WEIGHTS[axis];
    }
  }

  // 매칭된 키워드가 없으면 중립 (3점)
  const avgScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // 비율 기반 등급: 긍정/부정 키워드 비율로 1~5점 결정
  const positiveCount = matchedWords.filter((m) => m.score > 0).length;
  const negativeCount = matchedWords.filter((m) => m.score < 0).length;
  const hasStrongNegative = matchedWords.some((m) => m.score <= -2);
  const totalOpinionated = positiveCount + negativeCount;

  let rating: number;
  if (totalOpinionated === 0) {
    rating = 3; // 판단 불가
  } else {
    const posRatio = positiveCount / totalOpinionated;
    if (posRatio >= 0.90) rating = 5;      // 거의 완벽 (노이즈 1~2개 허용)
    else if (posRatio >= 0.65) rating = 4; // 대체로 만족, 살짝 아쉬움
    else if (posRatio >= 0.40) rating = 3; // 혼합
    else if (hasStrongNegative && posRatio < 0.20) rating = 1; // 최악+분노
    else rating = 2;                        // 불만족
  }

  // -100 ~ +100 정규화
  const sentimentScore = Math.max(-100, Math.min(100, Math.round(avgScore * 50)));

  let sentiment: ReviewSentiment;
  if (avgScore > 0.2) {
    sentiment = "positive";
  } else if (avgScore < -0.2) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }

  return {
    sentiment,
    sentimentScore,
    rating,
    matchCount: matchedWords.length,
    axisScores: {
      taste: axisAvg.taste,
      price: axisAvg.price,
      service: axisAvg.service,
      atmosphere: axisAvg.atmosphere,
    },
  };
}

export interface SentimentResult {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveRate: number;
  negativeRate: number;
  neutralRate: number;
  score: number; // 0~100 종합 점수
  grade: string;
  averageRating: number; // 1~5 평균 별점
  ratingDistribution: number[]; // [1점수, 2점수, 3점수, 4점수, 5점수]
}

function getGrade(rating: number): string {
  if (rating >= 4.5) return "맛집 확정";
  if (rating >= 3.8) return "맛집 인정";
  if (rating >= 3.0) return "괜찮은 곳";
  if (rating >= 2.3) return "호불호 갈림";
  if (rating >= 1.5) return "평가 낮음";
  return "비추천";
}

const GLOBAL_MEAN = 3.0;

/**
 * 마케팅 의심 패턴을 탐지하여 신뢰도 계수를 산출합니다 (0.7 ~ 1.0).
 *
 * 진짜 맛집: 긍정 60%, 중립 25%, 부정 15% → 신뢰도 ~1.0
 * 마케팅 맛집: 긍정 95%, 리뷰 시기 몰림, 광고 비율 높음 → 신뢰도 ~0.75
 */
function calculateCredibility(reviews: FilteredReview[]): number {
  const realReviews = reviews.filter((r) => !r.isAd && r.isRelevant);
  const allRelevant = reviews.filter((r) => r.isRelevant);
  const total = realReviews.length;

  if (total < 5) return 1.0; // 데이터 부족하면 판단 보류

  let credibility = 1.0;

  // 1. 균일성 페널티: 긍정 비율이 비정상적으로 높으면 의심
  //    진짜 맛집도 호불호가 있음. 95% 긍정은 자연스럽지 않음.
  const positiveCount = realReviews.filter((r) => r.sentiment === "positive").length;
  const posRate = positiveCount / total;
  if (posRate > 0.75) {
    // 75% → 페널티 없음, 100% → 0.875배
    credibility *= 1 - (posRate - 0.75) * 0.5;
  }

  // 2. 시간 클러스터링: 리뷰가 특정 2주에 몰리면 캠페인 의심
  const periodGroups = new Map<string, number>();
  for (const r of realReviews) {
    const ym = r.postdate.substring(0, 6);
    const half = parseInt(r.postdate.substring(6, 8)) <= 15 ? "a" : "b";
    const period = `${ym}${half}`;
    periodGroups.set(period, (periodGroups.get(period) || 0) + 1);
  }
  if (periodGroups.size > 0) {
    const peakCount = Math.max(...periodGroups.values());
    const peakConcentration = peakCount / total;
    if (peakConcentration > 0.3 && total >= 10) {
      // 30% → 페널티 없음, 80% → 0.85배
      credibility *= 1 - (peakConcentration - 0.3) * 0.3;
    }
  }

  // 3. 광고 비율: 광고 많으면 "진짜 리뷰"도 은근 광고일 가능성
  const adCount = allRelevant.filter((r) => r.isAd).length;
  const adRate = allRelevant.length > 0 ? adCount / allRelevant.length : 0;
  if (adRate > 0.2) {
    // 20% → 페널티 없음, 60% → 0.88배
    credibility *= 1 - (adRate - 0.2) * 0.3;
  }

  return Math.max(0.7, credibility); // 최대 30% 할인
}

/**
 * 전체 리뷰의 감성 분석 요약을 반환합니다.
 * 광고 리뷰와 비관련 리뷰는 제외하고 계산합니다.
 * 마케팅 의심 패턴이 감지되면 신뢰도 보정을 적용합니다.
 */
export function analyzeSentimentSummary(
  reviews: FilteredReview[]
): SentimentResult {
  const realReviews = reviews.filter((r) => !r.isAd && r.isRelevant);
  const total = realReviews.length;

  if (total === 0) {
    return {
      positive: 0, negative: 0, neutral: 0, total: 0,
      positiveRate: 0, negativeRate: 0, neutralRate: 0,
      score: 0, grade: "데이터 없음",
      averageRating: 0, ratingDistribution: [0, 0, 0, 0, 0],
    };
  }

  // 감성 키워드 2개 이상 매칭된 리뷰만 평균 계산에 포함
  // (매칭 0~1개는 API 스니펫이 짧아 판단 불가 → 평균 왜곡 방지)
  const MIN_MATCH_FOR_RATING = 2;

  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  const ratingDist = [0, 0, 0, 0, 0];

  for (const review of realReviews) {
    if (review.sentiment === "positive") positive++;
    else if (review.sentiment === "negative") negative++;
    else neutral++;

    // 충분한 키워드 매칭이 있는 리뷰만 별점 평균에 반영
    if (review.matchCount >= MIN_MATCH_FOR_RATING) {
      const effectiveRating = review.calibratedRating ?? review.rating;
      ratingSum += effectiveRating;
      ratingCount++;
      ratingDist[Math.max(0, Math.min(4, Math.round(effectiveRating) - 1))]++;
    }
  }

  const positiveRate = Math.round((positive / total) * 100);
  const negativeRate = Math.round((negative / total) * 100);
  const neutralRate = 100 - positiveRate - negativeRate;

  const rawAverage = ratingCount > 0
    ? Math.round((ratingSum / ratingCount) * 10) / 10
    : 3.0;

  // 신뢰도 보정: 마케팅 의심 패턴이 있으면 평균을 중앙(3.0)으로 끌어당김
  const credibility = calculateCredibility(reviews);
  const averageRating = Math.round(
    (GLOBAL_MEAN + (rawAverage - GLOBAL_MEAN) * credibility) * 10
  ) / 10;

  const score = Math.round(((averageRating - 1) / 4) * 100);

  return {
    positive, negative, neutral, total,
    positiveRate, negativeRate, neutralRate,
    score, grade: getGrade(averageRating),
    averageRating, ratingDistribution: ratingDist,
  };
}
