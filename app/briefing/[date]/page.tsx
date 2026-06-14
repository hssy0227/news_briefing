'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Article, Category } from '@/types/news';
import { groupByCategory, briefingToMarkdown } from '@/lib/format';
import AppHeader from '@/components/layout/AppHeader';
import CategoryTabs from '@/components/layout/CategoryTabs';
import BriefingHeader from '@/components/briefing/BriefingHeader';
import CategorySection from '@/components/briefing/CategorySection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';

/**
 * 특정 날짜 브리핑 페이지
 * URL 파라미터로 전달된 날짜의 브리핑을 표시한다.
 */
export default function BriefingDatePage() {
  const params = useParams();
  const date = params.date as string;

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  /**
   * 해당 날짜의 브리핑 데이터를 가져온다.
   */
  const fetchBriefing = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/briefing/${date}`);
      const result = await response.json();
      if (result.success) {
        setArticles(result.data.articles);
      }
    } catch (error) {
      console.error('브리핑 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  /**
   * 이메일 발송을 처리한다.
   */
  async function handleSendEmail() {
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const result = await response.json();

      if (result.success) {
        setToast({ message: '이메일이 발송되었습니다.', type: 'success' });
      } else {
        setToast({
          message: result.error || '이메일 발송에 실패했습니다.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('이메일 발송 실패:', error);
      setToast({ message: '이메일 발송에 실패했습니다.', type: 'error' });
    } finally {
      setIsSendingEmail(false);
    }
  }

  /**
   * 기사 업데이트를 로컬 상태에 반영한다.
   */
  function handleArticleUpdate(id: string, updates: Partial<Article>) {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  const filteredArticles =
    activeCategory === 'all'
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const categoryGroups = groupByCategory(filteredArticles);
  const fullMarkdown = briefingToMarkdown(groupByCategory(articles), date);

  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <BriefingHeader
          date={date}
          articleCount={articles.length}
          fullBriefingMarkdown={fullMarkdown}
          onSendEmail={handleSendEmail}
          onRefresh={fetchBriefing}
          isLoading={isLoading}
          isSendingEmail={isSendingEmail}
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-lg">
              해당 날짜의 브리핑이 없습니다.
            </p>
          </div>
        ) : (
          <div>
            {categoryGroups.map((group) => (
              <CategorySection
                key={group.category}
                label={group.label}
                articles={group.articles}
                onArticleUpdate={handleArticleUpdate}
              />
            ))}
          </div>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
