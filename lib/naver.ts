import axios from 'axios';
import type { NaverNewsItem, NaverNewsResponse, Category } from '@/types/news';
import { CATEGORY_KEYWORDS } from '@/lib/keywords';
import { filterNewsItems, deduplicateByUrl, cleanTitle } from '@/lib/filter';

const NAVER_API_URL = 'https://openapi.naver.com/v1/search/news.json';

/**
 * 네이버 뉴스 검색 API를 호출한다.
 * @param query - 검색 키워드
 * @param display - 결과 개수 (최대 100)
 * @param sort - 정렬 (date: 날짜순, sim: 관련도순)
 * @returns 네이버 뉴스 검색 응답
 */
async function searchNaverNews(
  query: string,
  display: number = 20,
  sort: string = 'date'
): Promise<NaverNewsResponse> {
  const response = await axios.get<NaverNewsResponse>(NAVER_API_URL, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
    },
    params: {
      query,
      display,
      sort,
    },
    timeout: 5000,
  });
  return response.data;
}

/** 수집된 뉴스 아이템에 카테고리 정보를 추가한 타입 */
export interface CategorizedNewsItem extends NaverNewsItem {
  category: Category;
  cleanTitle: string;
}

/**
 * 모든 카테고리의 키워드로 네이버 뉴스를 수집한다.
 * 블로그/광고/중복을 필터링하고, 키워드 관련도 및 카테고리 관련도를 검증한다.
 * @returns 카테고리가 태그된 뉴스 아이템 배열과 수집 통계
 */
export async function collectAllNews(): Promise<{
  articles: CategorizedNewsItem[];
  stats: { keywordCount: number; rawCount: number; filteredCount: number };
}> {
  const allItems: CategorizedNewsItem[] = [];
  let rawCount = 0;
  let keywordCount = 0;

  for (const categoryConfig of CATEGORY_KEYWORDS) {
    for (const keyword of categoryConfig.keywords) {
      keywordCount++;
      try {
        const response = await searchNaverNews(keyword, 20, 'date');
        rawCount += response.items.length;

        // 키워드와 카테고리를 함께 전달하여 관련도 필터링
        const filtered = filterNewsItems(
          response.items,
          keyword,
          categoryConfig.category
        );

        const categorized = filtered.map((item) => ({
          ...item,
          category: categoryConfig.category,
          cleanTitle: cleanTitle(item.title),
        }));

        allItems.push(...categorized);
      } catch (error) {
        console.error(`키워드 "${keyword}" 수집 실패:`, error);
      }
    }
  }

  const deduplicated = deduplicateByUrl(allItems) as CategorizedNewsItem[];

  return {
    articles: deduplicated,
    stats: {
      keywordCount,
      rawCount,
      filteredCount: deduplicated.length,
    },
  };
}

/**
 * 네이버 뉴스 API 아이템에서 언론사명을 추출한다.
 * originallink URL에서 도메인을 파싱하여 추출한다.
 * @param item - 네이버 뉴스 아이템
 * @returns 추출된 언론사명 또는 null
 */
export function extractSource(item: NaverNewsItem): string | null {
  try {
    const url = item.originallink || item.link;
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
