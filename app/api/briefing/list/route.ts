import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * 브리핑 목록 조회 API (아카이브용)
 * GET /api/briefing/list
 * 최근 90일 내 브리핑 목록을 날짜 역순으로 반환한다.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: briefings, error } = await supabase
      .from('briefings')
      .select('*')
      .order('date', { ascending: false })
      .limit(90);

    if (error) {
      console.error('브리핑 목록 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '브리핑 목록 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: briefings || [],
    });
  } catch (error) {
    console.error('브리핑 목록 오류:', error);
    return NextResponse.json(
      { success: false, error: '브리핑 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
