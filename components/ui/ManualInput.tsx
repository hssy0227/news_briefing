'use client';

import { useState } from 'react';
import type { Category } from '@/types/news';
import { CATEGORY_LABELS } from '@/types/news';

interface ManualInputProps {
  onSubmit: (url: string, category: Category) => void;
  isLoading: boolean;
}

/**
 * 수동 URL 입력 폼 컴포넌트
 * URL과 카테고리를 입력받아 스크래핑 요청을 보낸다.
 * @param onSubmit - 제출 핸들러
 * @param isLoading - 로딩 상태
 */
export default function ManualInput({ onSubmit, isLoading }: ManualInputProps) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<Category>('ai');
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 폼 제출을 처리한다.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), category);
    setUrl('');
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        수동 뉴스 추가
      </button>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 flex flex-col md:flex-row gap-2 p-3 bg-white border border-border rounded"
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="뉴스 URL을 붙여넣으세요"
            className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:border-accent"
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="px-3 py-2 text-sm border border-border rounded focus:outline-none focus:border-accent"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '추가 중...' : '추가'}
          </button>
        </form>
      )}
    </div>
  );
}
