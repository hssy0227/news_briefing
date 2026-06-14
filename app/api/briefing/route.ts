import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getTodayKST } from '@/lib/date';

/**
 * 브리핑 조회 API
 * GET /api/briefing?date=YYYY-MM-DD (단일 날짜)
 * GET /api/briefing?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (날짜 범위)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date') || getTodayKST();

    const supabase = createServerClient();

    // 날짜 범위 조회
    const from = startDate || date;
    const to = endDate || date;

    let query = supabase
      .from('articles')
      .select('*')
      .eq('is_excluded', false)
      .order('curation_score', { ascending: false, nullsFirst: false })
      .order('briefing_date', { ascending: false })
      .order('created_at')
      .limit(30);

    if (from === to) {
      query = query.eq('briefing_date', from);
    } else {
      query = query.gte('briefing_date', from).lte('briefing_date', to);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('기사 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '브리핑 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 단일 날짜인 경우 브리핑 메타데이터도 조회
    let briefing = null;
    if (from === to) {
      const { data } = await supabase
        .from('briefings')
        .select('*')
        .eq('date', from)
        .single();
      briefing = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        briefing: briefing || null,
        articles: articles || [],
      },
    });
  } catch (error) {
    console.error('브리핑 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '브리핑 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
