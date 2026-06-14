/** 뉴스 카테고리 타입 */
export type Category = 'ai' | 'ecommerce' | 'products';

/** 브리핑 상태 타입 */
export type BriefingStatus = 'draft' | 'published' | 'sent';

/** 수집 유형 타입 */
export type CollectionType = 'auto' | 'manual' | 'cron';

/** 개별 뉴스 기사 */
export interface Article {
  id: string;
  briefing_date: string;
  category: Category;
  title: string;
  original_title: string;
  url: string;
  source: string | null;
  published_at: string | null;
  summary_point1: string | null;
  summary_point2: string | null;
  is_manual: boolean;
  is_excluded: boolean;
  curation_score: number | null;
  curation_category: string | null;
  created_at: string;
  updated_at: string;
}

/** 기사 생성 시 필요한 필드 */
export interface ArticleInsert {
  briefing_date: string;
  category: Category;
  title: string;
  original_title: string;
  url: string;
  source?: string | null;
  published_at?: string | null;
  summary_point1?: string | null;
  summary_point2?: string | null;
  is_manual?: boolean;
  is_excluded?: boolean;
}

/** 기사 수정 시 사용하는 필드 */
export interface ArticleUpdate {
  title?: string;
  summary_point1?: string | null;
  summary_point2?: string | null;
  is_excluded?: boolean;
}

/** 일일 브리핑 메타데이터 */
export interface Briefing {
  id: string;
  date: string;
  status: BriefingStatus;
  article_count: number;
  email_sent_at: string | null;
  created_at: string;
}

/** 수집 로그 */
export interface CollectionLog {
  id: string;
  date: string;
  type: CollectionType;
  keyword_count: number;
  raw_count: number;
  filtered_count: number;
  error: string | null;
  created_at: string;
}

/** 카테고리별 키워드 설정 */
export interface CategoryKeywords {
  category: Category;
  label: string;
  keywords: string[];
}

/** 네이버 뉴스 검색 API 응답 아이템 */
export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

/** 네이버 뉴스 검색 API 응답 */
export interface NaverNewsResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

/** 스크래핑 결과 */
export interface ScrapedArticle {
  title: string;
  body: string;
  source: string | null;
  publishedAt: string | null;
  url: string;
}

/** API 응답 기본 형식 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 브리핑 조회 응답 */
export interface BriefingResponse {
  briefing: Briefing | null;
  articles: Article[];
}

/** 카테고리별 기사 그룹 */
export interface CategoryGroup {
  category: Category;
  label: string;
  articles: Article[];
}

/** 카테고리 라벨 매핑 */
export const CATEGORY_LABELS: Record<Category, string> = {
  ai: 'AI 관련',
  ecommerce: '이커머스(유통)',
  products: '제품/브랜드',
};
