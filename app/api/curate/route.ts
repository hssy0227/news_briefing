import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { curateArticles } from '@/lib/claude';
import { scrapeArticle } from '@/lib/scraper';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

/**
 * 전체 기사 큐레이션 API
 * POST /api/curate
 * body: { date?: string }
 *
 * 해당 날짜의 모든 기사(수동 제외 제외)에 큐레이션을 적용한다.
 * 기존 is_excluded 상태를 초기화 후 재판정한다.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || getTodayKST();

    const supabase = createServerClient();

    // 해당 날짜 전체 기사 조회 (수동 추가 기사는 is_manual=true이므로 제외 초기화에서 보호)
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_manual', false) // 수동 추가 기사는 큐레이션 제외 (항상 포함)
      .order('category')
      .order('created_at');

    if (fetchError || !articles) {
      return NextResponse.json({ success: false, error: '기사 조회 실패' }, { status: 500 });
    }

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, total: 0, passed: 0, excluded: 0 },
      });
    }

    // 기존 is_excluded 상태 초기화 (재큐레이션)
    await supabase
      .from('articles')
      .update({ is_excluded: false })
      .eq('briefing_date', date)
      .eq('is_manual', false);

    // 본문 스크래핑 (큐레이션 판단 정확도 향상)
    const bodies = await scrapeArticleBodies(articles as Article[]);
    console.log(`큐레이션용 스크래핑: ${bodies.size}/${articles.length}건`);

    // 전체 큐레이션 실행
    const curationResults = await curateArticles(articles as Article[], bodies);

    const excludedIds = curationResults.filter((r) => !r.include).map((r) => r.id);
    const passedCount = curationResults.filter((r) => r.include).length;

    // 큐레이션 결과 DB 저장 (점수 + 카테고리 + 포함여부)
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

    console.log(`큐레이션 완료: ${passedCount}/${articles.length}건 통과, ${excludedIds.length}건 제외`);

    return NextResponse.json({
      success: true,
      data: {
        date,
        total: articles.length,
        passed: passedCount,
        excluded: excludedIds.length,
      },
    });
  } catch (error) {
    console.error('큐레이션 오류:', error);
    return NextResponse.json({ success: false, error: '큐레이션 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function scrapeArticleBodies(articles: Article[]): Promise<Map<string, string>> {
  const bodyMap = new Map<string, string>();
  const CONCURRENCY = 5;
  const TIMEOUT_MS = 6000;

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (article) => {
        try {
          const scraped = await Promise.race([
            scrapeArticle(article.url),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
            ),
          ]);
          if (scraped.body && scraped.body.length > 100) {
            bodyMap.set(article.id, scraped.body.substring(0, 500));
          }
        } catch {
          // 스크래핑 실패 시 제목만으로 큐레이션
        }
      })
    );
  }

  return bodyMap;
}
