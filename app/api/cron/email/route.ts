import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendBriefingEmail } from '@/lib/email';
import { getTodayKST, subtractDays } from '@/lib/date';
import type { Article } from '@/types/news';

/**
 * 크론: 이메일 발송 + 90일 데이터 정리 (매일 14:10 KST)
 * GET /api/cron/email
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

    // 요약 완료된 기사 조회
    const { data: articles } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .not('summary_point1', 'is', null)
      .order('category')
      .order('created_at');

    let emailSent = false;
    if (articles && articles.length > 0) {
      emailSent = await sendBriefingEmail(date, articles as Article[]);

      if (emailSent) {
        await supabase.from('briefings').upsert(
          {
            date,
            status: 'sent',
            email_sent_at: new Date().toISOString(),
          },
          { onConflict: 'date' }
        );
      }
    }

    // 90일 초과 데이터 정리
    const cutoffDate = subtractDays(date, 90);

    await supabase.from('articles').delete().lt('briefing_date', cutoffDate);
    await supabase.from('briefings').delete().lt('date', cutoffDate);
    await supabase
      .from('collection_logs')
      .delete()
      .lt('date', cutoffDate);

    return NextResponse.json({
      success: true,
      data: {
        date,
        emailSent,
        articleCount: articles?.length || 0,
        cleanupCutoff: cutoffDate,
      },
    });
  } catch (error) {
    console.error('크론 이메일 오류:', error);
    return NextResponse.json(
      { success: false, error: '크론 이메일 실패' },
      { status: 500 }
    );
  }
}
