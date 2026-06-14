import { NextResponse } from 'next/server';
import { scrapeArticle } from '@/lib/scraper';
import { createServerClient } from '@/lib/supabase';
import { getTodayKST } from '@/lib/date';
import type { Category } from '@/types/news';

/**
 * 수동 URL 스크래핑 API
 * POST /api/scrape
 * body: { url: string, category: Category }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, category, date: bodyDate } = body as { url: string; category: Category; date?: string };

    if (!url || !category) {
      return NextResponse.json(
        { success: false, error: 'URL과 카테고리는 필수입니다.' },
        { status: 400 }
      );
    }

    const validCategories: Category[] = ['ai', 'ecommerce', 'products'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const date = bodyDate || getTodayKST();

    // 중복 확인
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('url', url)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 기사 URL입니다.' },
        { status: 409 }
      );
    }

    // 스크래핑 실행
    const scraped = await scrapeArticle(url);

    // DB 저장
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        briefing_date: date,
        category,
        title: scraped.title,
        original_title: scraped.title,
        url: scraped.url,
        source: scraped.source,
        published_at: scraped.publishedAt,
        is_manual: true,
      })
      .select()
      .single();

    if (error) {
      console.error('기사 저장 실패:', error);
      return NextResponse.json(
        { success: false, error: '기사 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 수집 로그
    await supabase.from('collection_logs').insert({
      date,
      type: 'manual',
      keyword_count: 0,
      raw_count: 1,
      filtered_count: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        article,
        scrapedBody: scraped.body.substring(0, 500),
      },
    });
  } catch (error) {
    console.error('스크래핑 오류:', error);
    return NextResponse.json(
      { success: false, error: '스크래핑 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
