'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Article, Category } from '@/types/news';
import { getTodayKST } from '@/lib/date';
import { groupByCategory, briefingToMarkdown } from '@/lib/format';
import AppHeader from '@/components/layout/AppHeader';
import CategoryTabs from '@/components/layout/CategoryTabs';
import BriefingHeader from '@/components/briefing/BriefingHeader';
import CategorySection from '@/components/briefing/CategorySection';
import ManualInput from '@/components/ui/ManualInput';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 메인 페이지 - 오늘의 브리핑
 * 지정 날짜 범위의 뉴스 브리핑을 신문형 레이아웃으로 표시한다.
 */
export default function HomePage() {
  const today = getTodayKST();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  /**
   * 브리핑 데이터를 서버에서 가져온다.
   */
  const fetchBriefing = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(
        startDate === endDate
          ? { date: startDate }
          : { startDate, endDate }
      );
      const response = await fetch(`/api/briefing?${params}`);
      const result = await response.json();
      if (result.success) {
        setArticles(result.data.articles);
      }
    } catch (error) {
      console.error('브리핑 조회 실패:', error);
      setToast({ message: '브리핑을 불러오는데 실패했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  /**
   * 날짜 범위를 변경하고 브리핑을 다시 로드한다.
   */
  function handleDateRangeChange(newStart: string, newEnd: string) {
    setStartDate(newStart);
    setEndDate(newEnd);
  }

  /**
   * 수동 뉴스 수집 → 큐레이션(전체) → 요약(통과분) 순서로 실행한다.
   */
  async function handleRefresh() {
    setIsLoading(true);
    try {
      // 1. 뉴스 수집
      const collectRes = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: endDate }),
      });
      const collectResult = await collectRes.json();

      if (collectResult.success) {
        setToast({
          message: `${collectResult.data.inserted}건의 새 뉴스를 수집했습니다. 큐레이션 중...`,
          type: 'info',
        });
      }

      // 2. 전체 기사 큐레이션 (기존 포함 재판정)
      const curateRes = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: endDate }),
      });
      const curateResult = await curateRes.json();

      if (curateResult.success) {
        setToast({
          message: `큐레이션 완료: ${curateResult.data.passed}건 통과. 요약 생성 중...`,
          type: 'info',
        });
      }

      // 3. 통과 기사 요약
      await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: endDate }),
      });

      // 4. 브리핑 다시 로드
      await fetchBriefing();
      setToast({ message: '브리핑이 업데이트됐습니다.', type: 'success' });
    } catch (error) {
      console.error('새로고침 실패:', error);
      setToast({ message: '새로고침에 실패했습니다.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * 수동 URL 스크래핑을 처리한다.
   */
  async function handleManualScrape(url: string, category: Category) {
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category, date: endDate }),
      });
      const result = await response.json();

      if (result.success) {
        setToast({ message: '기사가 추가되었습니다.', type: 'success' });

        // AI 요약 생성
        await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: endDate }),
        });

        await fetchBriefing();
      } else {
        setToast({
          message: result.error || '기사 추가에 실패했습니다.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('스크래핑 실패:', error);
      setToast({ message: '스크래핑에 실패했습니다.', type: 'error' });
    } finally {
      setIsScraping(false);
    }
  }

  /**
   * 이메일 발송을 처리한다. (종료일 기준)
   */
  async function handleSendEmail() {
    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: endDate }),
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

  // 카테고리 필터 적용
  const filteredArticles =
    activeCategory === 'all'
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const categoryGroups = groupByCategory(filteredArticles);
  const fullMarkdown = briefingToMarkdown(
    groupByCategory(articles),
    startDate === endDate ? startDate : `${startDate} ~ ${endDate}`
  );

  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <ManualInput onSubmit={handleManualScrape} isLoading={isScraping} />

        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <BriefingHeader
          startDate={startDate}
          endDate={endDate}
          articleCount={articles.length}
          fullBriefingMarkdown={fullMarkdown}
          onSendEmail={handleSendEmail}
          onRefresh={handleRefresh}
          onDateRangeChange={handleDateRangeChange}
          isLoading={isLoading}
          isSendingEmail={isSendingEmail}
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-lg">해당 기간의 브리핑이 없습니다.</p>
            <p className="text-muted text-sm mt-2">
              &quot;새로고침&quot; 버튼을 눌러 뉴스를 수집하거나, URL을 직접 추가하세요.
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

      <footer className="text-center text-xs text-muted py-4 border-t border-border">
        Daily News Briefing · 이커머스 전략팀
      </footer>

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
