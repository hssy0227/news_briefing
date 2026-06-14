import type { Article, CategoryGroup } from '@/types/news';
import { CATEGORY_LABELS } from '@/types/news';

/**
 * 개별 기사를 마크다운 형식으로 변환한다.
 * @param article - 기사 객체
 * @returns 마크다운 텍스트
 */
export function articleToMarkdown(article: Article): string {
  const lines: string[] = [];
  lines.push(`**${article.title}**`);
  if (article.summary_point1) {
    lines.push(`- ${article.summary_point1}`);
  }
  if (article.summary_point2) {
    lines.push(`- ${article.summary_point2}`);
  }
  lines.push(article.url);
  return lines.join('\n');
}

/**
 * 카테고리별 기사 그룹을 마크다운 브리핑 형식으로 변환한다.
 * @param groups - 카테고리별 기사 그룹 배열
 * @param date - 브리핑 날짜 (YYYY-MM-DD)
 * @returns 전체 브리핑 마크다운 텍스트
 */
export function briefingToMarkdown(
  groups: CategoryGroup[],
  date: string
): string {
  const lines: string[] = [];
  lines.push(`# Daily News Briefing - ${date}`);
  lines.push('');

  for (const group of groups) {
    if (group.articles.length === 0) continue;

    lines.push(`## ${group.label}`);
    lines.push('');

    for (const article of group.articles) {
      lines.push(articleToMarkdown(article));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 기사 목록을 카테고리별 그룹으로 분류한다.
 * @param articles - 기사 배열
 * @returns 카테고리별 그룹 배열
 */
export function groupByCategory(articles: Article[]): CategoryGroup[] {
  const categories: Array<'ai' | 'ecommerce' | 'products'> = [
    'ai',
    'ecommerce',
    'products',
  ];

  return categories.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    articles: articles.filter((a) => a.category === category),
  }));
}
