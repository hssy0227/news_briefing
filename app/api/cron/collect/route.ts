import { NextResponse } from 'next/server';
import { collectAllNews, extractSource } from '@/lib/naver';
import { createServerClient } from '@/lib/supabase';
import { getTodayKST } from '@/lib/date';
import { stripHtmlTags } from '@/lib/filter';
import type { ArticleInsert } from '@/types/news';

/**
 * 크론: 뉴스 자동 수집 (매일 14:00 KST)
 * GET /api/cron/collect
 * Vercel Cron에 의해 자동 호출된다.
 */
export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = getTodayKST();
    const supabase = createServerClient();

    const { articles, stats } = await collectAllNews();

    // 기존 URL 조회
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('url')
      .eq('briefing_date', date);

    const existingUrls = new Set(
      (existingArticles || []).map((a: { url: string }) => a.url)
    );

    const newArticles: ArticleInsert[] = articles
      .filter((item) => {
        const url = item.originallink || item.link;
        return !existingUrls.has(url);
      })
      .map((item) => ({
        briefing_date: date,
        category: item.category,
        title: stripHtmlTags(item.title),
        original_title: item.title,
        url: item.originallink || item.link,
        source: extractSource(item),
        published_at: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : null,
        is_manual: false,
      }));

    let insertedCount = 0;
    if (newArticles.length > 0) {
      const { data } = await supabase
        .from('articles')
        .insert(newArticles)
        .select();
      insertedCount = data?.length || 0;
    }

    // 로그 저장
    await supabase.from('collection_logs').insert({
      date,
      type: 'cron',
      keyword_count: stats.keywordCount,
      raw_count: stats.rawCount,
      filtered_count: insertedCount,
    });

    // 브리핑 레코드 갱신
    const { data: totalArticles } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('briefing_date', date)
      .eq('is_excluded', false);

    await supabase.from('briefings').upsert(
      { date, status: 'draft', article_count: totalArticles?.length || 0 },
      { onConflict: 'date' }
    );

    return NextResponse.json({
      success: true,
      data: { date, inserted: insertedCount },
    });
  } catch (error) {
    console.error('크론 수집 오류:', error);
    return NextResponse.json(
      { success: false, error: '크론 수집 실패' },
      { status: 500 }
    );
  }
}
