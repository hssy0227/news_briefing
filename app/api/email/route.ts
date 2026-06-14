import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendBriefingEmail } from '@/lib/email';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

/**
 * 이메일 발송 API
 * POST /api/email
 * body: { date?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || getTodayKST();

    const supabase = createServerClient();

    // 해당 날짜 기사 조회
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .not('summary_point1', 'is', null)
      .order('category')
      .order('created_at');

    if (error) {
      return NextResponse.json(
        { success: false, error: '기사 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '발송할 기사가 없습니다.' },
        { status: 400 }
      );
    }

    // 이메일 발송
    const sent = await sendBriefingEmail(date, articles as Article[]);

    if (!sent) {
      return NextResponse.json(
        { success: false, error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 브리핑 상태 업데이트
    await supabase
      .from('briefings')
      .upsert(
        {
          date,
          status: 'sent',
          email_sent_at: new Date().toISOString(),
        },
        { onConflict: 'date' }
      );

    return NextResponse.json({
      success: true,
      data: {
        date,
        articleCount: articles.length,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return NextResponse.json(
      { success: false, error: '이메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
