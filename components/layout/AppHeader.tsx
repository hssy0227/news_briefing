'use client';

import Link from 'next/link';

/**
 * 앱 헤더 컴포넌트 (신문 마스트헤드 스타일)
 */
export default function AppHeader() {
  return (
    <header className="bg-white border-b-2 border-accent">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="text-center">
          <Link href="/" className="no-underline">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Daily News Briefing
            </h1>
          </Link>
          <p className="text-muted text-sm mt-1">
            이커머스 · 유통 · AI · 가전 마켓 인텔리전스
          </p>
        </div>
        <nav className="flex justify-center gap-6 mt-3 text-sm">
          <Link
            href="/"
            className="text-foreground hover:text-accent transition-colors"
          >
            오늘의 브리핑
          </Link>
          <Link
            href="/archive"
            className="text-foreground hover:text-accent transition-colors"
          >
            아카이브
          </Link>
        </nav>
      </div>
    </header>
  );
}
