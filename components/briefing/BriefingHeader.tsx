'use client';

import { formatDateKorean, getTodayKST } from '@/lib/date';
import CopyButton from './CopyButton';

interface BriefingHeaderProps {
  startDate: string;
  endDate: string;
  articleCount: number;
  fullBriefingMarkdown: string;
  onSendEmail: () => void;
  onRefresh: () => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  isLoading: boolean;
  isSendingEmail: boolean;
}

/**
 * 브리핑 헤더 컴포넌트
 * 날짜 범위 선택기, 기사 수, 전체 복사/이메일/새로고침 버튼을 포함한다.
 */
export default function BriefingHeader({
  startDate,
  endDate,
  articleCount,
  fullBriefingMarkdown,
  onSendEmail,
  onRefresh,
  onDateRangeChange,
  isLoading,
  isSendingEmail,
}: BriefingHeaderProps) {
  const today = getTodayKST();
  const isSingleDay = startDate === endDate;

  /** 시작일 변경 (종료일보다 클 수 없음) */
  function handleStartDateChange(value: string) {
    if (!value) return;
    const newEnd = value > endDate ? value : endDate;
    onDateRangeChange(value, newEnd);
  }

  /** 종료일 변경 (시작일보다 작을 수 없음) */
  function handleEndDateChange(value: string) {
    if (!value) return;
    const newStart = value < startDate ? value : startDate;
    onDateRangeChange(newStart, value);
  }

  /** 오늘로 빠르게 이동 */
  function handleGoToday() {
    onDateRangeChange(today, today);
  }

  return (
    <div className="mb-4">
      <div className="newspaper-divider" />
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">

        {/* 날짜 범위 선택 */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-xl font-bold">
              {isSingleDay
                ? formatDateKorean(startDate)
                : `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)}`}
            </h2>
            {endDate === today && (
              <span className="text-xs px-1.5 py-0.5 bg-accent text-white rounded">오늘</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted">
              <label className="shrink-0">시작</label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                disabled={isLoading}
                className="border border-border rounded px-2 py-1 text-sm text-foreground bg-white hover:border-foreground disabled:opacity-50 cursor-pointer"
              />
            </div>
            <span className="text-muted">~</span>
            <div className="flex items-center gap-1 text-sm text-muted">
              <label className="shrink-0">종료</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => handleEndDateChange(e.target.value)}
                disabled={isLoading}
                className="border border-border rounded px-2 py-1 text-sm text-foreground bg-white hover:border-foreground disabled:opacity-50 cursor-pointer"
              />
            </div>
            {endDate !== today && (
              <button
                onClick={handleGoToday}
                disabled={isLoading}
                className="text-xs px-2 py-1 border border-border rounded text-muted hover:border-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                오늘로
              </button>
            )}
          </div>

          <p className="text-sm text-muted mt-1">
            총 {articleCount}건의 뉴스
            {!isSingleDay && ` (${startDate} ~ ${endDate})`}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <CopyButton
            text={fullBriefingMarkdown}
            label="전체 복사"
            className="!px-3 !py-1.5 !text-sm"
          />
          <button
            onClick={onSendEmail}
            disabled={isSendingEmail || articleCount === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded bg-white text-foreground hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {isSendingEmail ? '발송 중...' : '이메일 발송'}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded bg-white text-foreground hover:border-foreground disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>
      </div>
      <div className="newspaper-divider-thin" />
    </div>
  );
}
