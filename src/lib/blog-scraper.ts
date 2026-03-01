/**
 * 네이버 블로그 본문 크롤러
 * Naver Blog Search API의 description (~200자)만으로는 감성 분석이 부정확하므로,
 * 각 블로그 글의 본문 전체를 가져와서 분석 정확도를 높입니다.
 */

/**
 * 블로그 URL에서 blogId와 logNo를 추출합니다.
 * 지원 형식:
 *   https://blog.naver.com/{blogId}/{logNo}
 *   https://m.blog.naver.com/{blogId}/{logNo}
 *   https://blog.naver.com/PostView.naver?blogId={id}&logNo={no}
 */
function parseBlogUrl(url: string): { blogId: string; logNo: string } | null {
  try {
    const u = new URL(url);

    // blog.naver.com/{blogId}/{logNo} 형식
    if (u.hostname.includes("blog.naver.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
        return { blogId: parts[0], logNo: parts[1] };
      }
      // PostView.naver?blogId=xxx&logNo=yyy 형식
      const blogId = u.searchParams.get("blogId");
      const logNo = u.searchParams.get("logNo");
      if (blogId && logNo) {
        return { blogId, logNo };
      }
    }
  } catch {
    // URL 파싱 실패
  }
  return null;
}

/**
 * HTML에서 모든 태그를 제거하고 텍스트만 추출합니다.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

/**
 * 네이버 블로그 본문 텍스트를 추출합니다.
 * SmartEditor 3의 본문 영역(se-main-container) 전체에서 텍스트를 가져옵니다.
 * 중첩 태그(<b>, <strong>, <a> 등) 내부의 텍스트도 모두 포함합니다.
 */
async function fetchBlogContent(
  blogId: string,
  logNo: string
): Promise<string | null> {
  try {
    const url = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=View&widgetTypeCall=true&directAccess=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const parts: string[] = [];
    let match;

    // 1. SmartEditor 3: <p class="se-text-paragraph ...">전체 내용</p>
    const paragraphRegex =
      /<p[^>]*class="se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
    while ((match = paragraphRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text) parts.push(text);
    }

    // 2. OG 링크 제목/해시태그: <strong class="se-oglink-title">...</strong>
    const ogRegex =
      /<strong[^>]*class="se-oglink-title"[^>]*>([\s\S]*?)<\/strong>/g;
    while ((match = ogRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text) parts.push(text);
    }

    // 3. 지도 정보: <span class="se-map-title">...</span>
    const mapRegex =
      /<span[^>]*class="se-map-title"[^>]*>([\s\S]*?)<\/span>/g;
    while ((match = mapRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text) parts.push(text);
    }

    if (parts.length > 0) {
      return decodeHtmlEntities(parts.join(" "));
    }

    // 4. 구형 에디터 폴백: 본문 영역의 모든 <p> 텍스트
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    while ((match = pRegex.exec(html)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length > 2) parts.push(text);
    }

    return parts.length > 0 ? decodeHtmlEntities(parts.join(" ")) : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 여러 블로그의 본문을 병렬로 가져옵니다.
 * 과도한 요청 방지를 위해 동시 요청 수를 제한합니다.
 *
 * @param urls - 블로그 URL 배열
 * @param concurrency - 동시 요청 수 (기본 5)
 * @returns URL -> 본문 텍스트 Map (실패한 URL은 포함되지 않음)
 */
export async function fetchBlogContents(
  urls: string[],
  concurrency: number = 5
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Promise.allSettled로 모든 URL을 처리 (세마포어로 동시성 제한)
  let activeCount = 0;
  const waiting: (() => void)[] = [];

  function acquire(): Promise<void> {
    if (activeCount < concurrency) {
      activeCount++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => waiting.push(resolve));
  }

  function release() {
    activeCount--;
    const next = waiting.shift();
    if (next) {
      activeCount++;
      next();
    }
  }

  async function processUrl(url: string, attempt: number = 1): Promise<void> {
    const parsed = parseBlogUrl(url);
    if (!parsed) return;

    await acquire();
    try {
      const content = await fetchBlogContent(parsed.blogId, parsed.logNo);
      if (content && content.length > 50) {
        results.set(url, content);
      } else if (content === null && attempt === 1) {
        // 1차 실패 시 재시도
        release();
        await acquire();
        const retryContent = await fetchBlogContent(parsed.blogId, parsed.logNo);
        if (retryContent && retryContent.length > 50) {
          results.set(url, retryContent);
        }
        return; // release는 finally에서
      }
    } finally {
      release();
    }
  }

  await Promise.allSettled(urls.map((url) => processUrl(url)));

  return results;
}
