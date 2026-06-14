'use client';

import type { Category } from '@/types/news';
import { CATEGORY_LABELS } from '@/types/news';

interface CategoryTabsProps {
  activeCategory: Category | 'all';
  onCategoryChange: (category: Category | 'all') => void;
}

/**
 * 카테고리 필터 탭 컴포넌트
 * @param activeCategory - 현재 선택된 카테고리
 * @param onCategoryChange - 카테고리 변경 핸들러
 */
export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const tabs: Array<{ key: Category | 'all'; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'ai', label: CATEGORY_LABELS.ai },
    { key: 'ecommerce', label: CATEGORY_LABELS.ecommerce },
    { key: 'products', label: CATEGORY_LABELS.products },
  ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onCategoryChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === tab.key
              ? 'border-b-2 border-accent text-accent'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
