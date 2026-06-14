'use client';

/**
 * 로딩 스피너 컴포넌트
 * 데이터 로딩 중 표시한다.
 */
export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      <p className="mt-3 text-sm text-muted">로딩 중...</p>
    </div>
  );
}
