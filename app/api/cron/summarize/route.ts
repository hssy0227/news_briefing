import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateSummaries } from '@/lib/claude';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

/**
 * 크론: AI 요약 생성 (매일 14:05 KST)
 * GET /api/cron/summarize
 * Vercel Cron에 의해 자동 호출된다.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = getTodayKST();
    const supabase = createServerClient();

    // 요약 없는 기사 조회
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .is('summary_point1', null)
      .order('category')
      .order('created_at');

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, summarized: 0 },
      });
    }

    const summaries = await generateSummaries(articles as Article[]);

    let updatedCount = 0;
    for (const summary of summaries) {
      const { error } = await supabase
        .from('articles')
        .update({
          title: summary.title,
          summary_point1: summary.summary_point1,
          summary_point2: summary.summary_point2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', summary.id);

      if (!error) updatedCount++;
    }

    await supabase.from('briefings').upsert(
      { date, status: 'published', article_count: updatedCount },
      { onConflict: 'date' }
    );

    return NextResponse.json({
      success: true,
      data: { date, summarized: updatedCount },
    });
  } catch (error) {
    console.error('크론 요약 오류:', error);
    return NextResponse.json(
      { success: false, error: '크론 요약 실패' },
      { status: 500 }
    );
  }
}
