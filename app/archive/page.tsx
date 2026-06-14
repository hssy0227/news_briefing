'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Briefing } from '@/types/news';
import { formatDateKorean } from '@/lib/date';

/**
 * 아카이브 페이지 - 날짜별 과거 브리핑 목록
 */
export default function ArchivePage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /**
     * 브리핑 아카이브 목록을 가져온다.
     */
    async function fetchArchive() {
      try {
        const response = await fetch('/api/briefing/list');
        const result = await response.json();

        if (result.success && result.data) {
          setBriefings(result.data);
        }
      } catch (error) {
        console.error('아카이브 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArchive();
  }, []);

  return (
    <>
      <AppHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <h2 className="font-serif text-2xl font-bold mb-6">브리핑 아카이브</h2>

        {isLoading ? (
          <LoadingSpinner />
        ) : briefings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">아직 저장된 브리핑이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {briefings.map((briefing) => (
              <Link
                key={briefing.id}
                href={`/briefing/${briefing.date}`}
                className="block p-4 bg-white border border-border rounded hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold">
                      {formatDateKorean(briefing.date)}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {briefing.article_count}건의 뉴스
                      {briefing.status === 'sent' && ' · 이메일 발송 완료'}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      briefing.status === 'sent'
                        ? 'bg-green-50 text-green-700'
                        : briefing.status === 'published'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {briefing.status === 'sent'
                      ? '발송됨'
                      : briefing.status === 'published'
                      ? '게시됨'
                      : '초안'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
