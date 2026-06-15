import { NextResponse } from 'next/server';

export const maxDuration = 60; // Vercel Hobby 최대 허용 60초
import { collectAllNews, extractSource } from '@/lib/naver';
import { createServerClient } from '@/lib/supabase';
import { getTodayKST } from '@/lib/date';
import { stripHtmlTags, cleanTitle } from '@/lib/filter';
import type { ArticleInsert } from '@/types/news';

/**
 * 네이버 뉴스 자동 수집 API
 * POST /api/collect
 * body: { date?: string } (기본값: 오늘 KST)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || getTodayKST();

    const supabase = createServerClient();

    // 네이버 뉴스 수집
    const { articles, stats } = await collectAllNews();

    // 오늘 날짜에 이미 저장된 URL 목록 조회
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('url')
      .eq('briefing_date', date);

    const existingUrls = new Set(
      (existingArticles || []).map((a: { url: string }) => a.url)
    );

    // 새로운 기사만 필터링하여 Insert 데이터 생성
    const newArticles: ArticleInsert[] = articles
      .filter((item) => {
        const url = item.originallink || item.link;
        return !existingUrls.has(url);
      })
      .map((item) => ({
        briefing_date: date,
        category: item.category,
        title: item.cleanTitle || cleanTitle(item.title),
        original_title: stripHtmlTags(item.title),
        url: item.originallink || item.link,
        source: extractSource(item),
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        is_manual: false,
      }));

    // DB에 기사 저장
    let insertedCount = 0;
    if (newArticles.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .insert(newArticles)
        .select();

      if (error) {
        console.error('기사 저장 실패:', error);
      } else {
        insertedCount = data?.length || 0;
      }
    }

    // 수집 로그 저장
    await supabase.from('collection_logs').insert({
      date,
      type: 'auto',
      keyword_count: stats.keywordCount,
      raw_count: stats.rawCount,
      filtered_count: insertedCount,
    });

    // 브리핑 레코드 생성/업데이트
    const { data: totalArticles } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('briefing_date', date)
      .eq('is_excluded', false);

    await supabase
      .from('briefings')
      .upsert(
        {
          date,
          status: 'draft',
          article_count: totalArticles?.length || 0,
        },
        { onConflict: 'date' }
      );

    return NextResponse.json({
      success: true,
      data: {
        date,
        collected: stats.rawCount,
        filtered: stats.filteredCount,
        inserted: insertedCount,
        duplicatesSkipped: newArticles.length - insertedCount,
      },
    });
  } catch (error) {
    console.error('뉴스 수집 오류:', error);
    return NextResponse.json(
      { success: false, error: '뉴스 수집 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
