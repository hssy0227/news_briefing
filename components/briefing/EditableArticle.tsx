'use client';

import { useState } from 'react';
import type { Article } from '@/types/news';
import CopyButton from './CopyButton';
import { articleToMarkdown } from '@/lib/format';

interface EditableArticleProps {
  article: Article;
  onUpdate: (id: string, updates: Partial<Article>) => void;
}

/**
 * 수정 가능한 기사 카드 컴포넌트
 * 인라인 편집 모드를 지원하여 제목과 요약을 직접 수정할 수 있다.
 * @param article - 기사 데이터
 * @param onUpdate - 수정 완료 핸들러
 */
export default function EditableArticle({
  article,
  onUpdate,
}: EditableArticleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(article.title);
  const [editPoint1, setEditPoint1] = useState(article.summary_point1 || '');
  const [editPoint2, setEditPoint2] = useState(article.summary_point2 || '');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * 편집 내용을 저장한다.
   */
  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/article/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          summary_point1: editPoint1 || null,
          summary_point2: editPoint2 || null,
        }),
      });

      if (response.ok) {
        onUpdate(article.id, {
          title: editTitle,
          summary_point1: editPoint1 || null,
          summary_point2: editPoint2 || null,
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * 편집을 취소하고 원래 값으로 되돌린다.
   */
  function handleCancel() {
    setEditTitle(article.title);
    setEditPoint1(article.summary_point1 || '');
    setEditPoint2(article.summary_point2 || '');
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="article-card bg-blue-50/50 rounded p-3">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full font-serif font-bold text-sm mb-2 px-2 py-1 border border-border rounded"
          placeholder="기사 제목"
        />
        <input
          type="text"
          value={editPoint1}
          onChange={(e) => setEditPoint1(e.target.value)}
          className="w-full text-sm mb-1 px-2 py-1 border border-border rounded"
          placeholder="주요 내용 1"
        />
        <input
          type="text"
          value={editPoint2}
          onChange={(e) => setEditPoint2(e.target.value)}
          className="w-full text-sm mb-2 px-2 py-1 border border-border rounded"
          placeholder="주요 내용 2 (선택)"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs border border-border rounded hover:bg-gray-100"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  const scoreColor =
    (article.curation_score ?? 0) >= 9
      ? 'bg-red-100 text-red-700'
      : (article.curation_score ?? 0) >= 7
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-500';

  return (
    <div className="article-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {article.curation_score !== null && (
            <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${scoreColor}`}>
              {article.curation_score}점{article.curation_category ? ` · ${article.curation_category}` : ''}
            </span>
          )}
          <h3 className="font-serif font-bold text-sm leading-snug">
            {article.title}
          </h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-xs border border-border rounded text-muted hover:text-foreground hover:border-foreground"
            title="수정"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <CopyButton text={articleToMarkdown(article)} label="복사" />
        </div>
      </div>
      {article.summary_point1 && (
        <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
          · {article.summary_point1}
        </p>
      )}
      {article.summary_point2 && (
        <p className="text-sm text-foreground/80 leading-relaxed">
          · {article.summary_point2}
        </p>
      )}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline mt-1 inline-block truncate max-w-full"
      >
        {article.url}
      </a>
    </div>
  );
}
