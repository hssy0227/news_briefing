import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { curateArticles } from '@/lib/claude';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

export const maxDuration = 60;

/**
 * 크론: AI 큐레이션 (매일 14:02 KST)
 * GET /api/cron/curate
 * 수집된 기사를 평가하여 관련도 낮은 기사를 제외한다.
 * 본문 스크래핑 없이 제목만으로 빠르게 처리한다.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const date = getTodayKST();
    const supabase = createServerClient();

    // 아직 큐레이션 안 된 기사 조회 (curation_score가 null인 것)
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_manual', false)
      .is('curation_score', null)
      .order('created_at');

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, curated: 0, message: '큐레이션할 기사가 없습니다.' },
      });
    }

    // 제목만으로 큐레이션 (본문 스크래핑 없음 - 속도 최적화)
    const emptyBodies = new Map<string, string>();
    const curationResults = await curateArticles(articles as Article[], emptyBodies);

    const now = new Date().toISOString();
    for (const result of curationResults) {
      await supabase
        .from('articles')
        .update({
          curation_score: result.score,
          curation_category: result.category,
          is_excluded: !result.include,
          updated_at: now,
        })
        .eq('id', result.id);
    }

    const passed = curationResults.filter((r) => r.include).length;
    const excluded = curationResults.filter((r) => !r.include).length;

    return NextResponse.json({
      success: true,
      data: { date, total: articles.length, passed, excluded },
    });
  } catch (error) {
    console.error('크론 큐레이션 오류:', error);
    return NextResponse.json(
      { success: false, error: '크론 큐레이션 실패' },
      { status: 500 }
    );
  }
}
