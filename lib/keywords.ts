import type { CategoryKeywords } from '@/types/news';

/**
 * 카테고리별 뉴스 수집 키워드 정의
 * C커머스 = 중국 크로스보더 이커머스 (테무/알리/쉬인)
 * C브랜드 = 중국 브랜드 (가전/IT 분야)
 */
export const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  {
    category: 'ai',
    label: 'AI 관련',
    keywords: [
      '생성형 AI',
      '에이전틱 커머스',
      '에이전틱 AI',
      'AI 디바이스',
      'AI 가전',
    ],
  },
  {
    category: 'ecommerce',
    label: '이커머스(유통)',
    keywords: [
      '네이버 쇼핑',
      '쿠팡',
      'G마켓',
      '11번가',
      'SSG닷컴',
      '신세계',
      '테무',
      '알리익스프레스',
      '쉬인',
      '홈쇼핑',
      '이커머스',
      '온라인 쇼핑',
      '온라인 시장',
    ],
  },
  {
    category: 'products',
    label: '제품/브랜드',
    keywords: [
      '애플',
      '아이폰',
      'LG전자',
      '가전 구독',
      '중국 가전',
      '가전',
      '온라인 가전',
      '휴대폰',
    ],
  },
];

/**
 * 전체 키워드 목록을 반환한다.
 * @returns 모든 카테고리의 키워드 배열
 */
export function getAllKeywords(): string[] {
  return CATEGORY_KEYWORDS.flatMap((c) => c.keywords);
}

/**
 * 특정 카테고리의 키워드 목록을 반환한다.
 * @param category - 카테고리 코드
 * @returns 해당 카테고리의 키워드 배열
 */
export function getKeywordsByCategory(category: string): string[] {
  const found = CATEGORY_KEYWORDS.find((c) => c.category === category);
  return found ? found.keywords : [];
}
