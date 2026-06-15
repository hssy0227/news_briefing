import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateSummaries } from '@/lib/claude';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

export const maxDuration = 60;

/**
 * 크론: AI 요약 생성 (매일 14:07 KST)
 * GET /api/cron/summarize
 * 큐레이션 통과 기사 중 점수 높은 순 30건만 요약한다.
 * 본문 스크래핑 없이 제목만으로 처리한다 (속도 최적화).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = getTodayKST();
    const supabase = createServerClient();

    // 요약 없는 기사 중 점수 높은 순 30건
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .or('summary_point1.is.null,summary_point1.eq.요약 생성 실패')
      .order('curation_score', { ascending: false, nullsFirst: false })
      .limit(30);

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, summarized: 0, message: '요약할 기사가 없습니다.' },
      });
    }

    // 본문 없이 요약 (크론에서는 속도 우선)
    const emptyBodies = new Map<string, string>();
    const summaries = await generateSummaries(articles as Article[], emptyBodies);

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
