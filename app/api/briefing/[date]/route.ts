import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * 특정 날짜 브리핑 조회 API
 * GET /api/briefing/[date]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    const supabase = createServerClient();

    const { data: briefing } = await supabase
      .from('briefings')
      .select('*')
      .eq('date', date)
      .single();

    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .order('category')
      .order('created_at');

    if (error) {
      return NextResponse.json(
        { success: false, error: '브리핑 조회에 실패했습니다.' },
        { status: 500 }
      );
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
