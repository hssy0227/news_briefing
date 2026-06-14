'use client';

import type { Article } from '@/types/news';
import EditableArticle from './EditableArticle';

interface CategorySectionProps {
  label: string;
  articles: Article[];
  onArticleUpdate: (id: string, updates: Partial<Article>) => void;
}

/**
 * 카테고리별 신문 섹션 컴포넌트
 * 신문의 섹션처럼 카테고리 제목과 기사 목록을 표시한다.
 * @param label - 카테고리 라벨
 * @param articles - 해당 카테고리 기사 배열
 * @param onArticleUpdate - 기사 수정 핸들러
 */
export default function CategorySection({
  label,
  articles,
  onArticleUpdate,
}: CategorySectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="section-header font-serif text-lg font-bold text-accent">
        {label}
        <span className="text-sm font-normal text-muted ml-2">
          ({articles.length}건)
        </span>
      </h2>
      <div>
        {articles.map((article) => (
          <EditableArticle
            key={article.id}
            article={article}
            onUpdate={onArticleUpdate}
          />
        ))}
      </div>
    </section>
  );
}
