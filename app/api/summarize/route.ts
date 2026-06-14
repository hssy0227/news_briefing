import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { curateArticles, generateSummaries } from '@/lib/claude';
import { scrapeArticle } from '@/lib/scraper';
import { getTodayKST } from '@/lib/date';
import type { Article } from '@/types/news';

/**
 * 뉴스 큐레이션 + AI 요약 생성 API
 * POST /api/summarize
 * body: { date?: string } (기본값: 오늘 KST)
 *
 * 처리 순서:
 * 1. 미처리 기사 조회
 * 2. 본문 스크래핑
 * 3. 큐레이션 (7점 미만 → is_excluded = true)
 * 4. 통과 기사 요약
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const date = body.date || getTodayKST();

    const supabase = createServerClient();

    // 미처리 기사 조회 (요약 없고 미제외)
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('briefing_date', date)
      .eq('is_excluded', false)
      .or('summary_point1.is.null,summary_point1.eq.요약 생성 실패')
      .order('category')
      .order('created_at');

    if (fetchError) {
      console.error('기사 조회 실패:', fetchError);
      return NextResponse.json(
        { success: false, error: '기사 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, curated: 0, summarized: 0, message: '처리할 기사가 없습니다.' },
      });
    }

    // 본문 스크래핑 (큐레이션 + 요약에 공통 사용)
    const bodies = await scrapeArticleBodies(articles as Article[]);
    console.log(`본문 스크래핑 완료: ${bodies.size}/${articles.length}건`);

    // ── Step 1: 큐레이션 ──────────────────────────
    const curationResults = await curateArticles(articles as Article[], bodies);
    console.log(`큐레이션 완료: ${curationResults.filter(r => r.include).length}/${curationResults.length}건 통과`);

    // 제외 기사 DB 업데이트
    const excludedIds = curationResults.filter((r) => !r.include).map((r) => r.id);

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

    // 통과 기사만 요약 대상으로 필터링
    const includedIds = new Set(curationResults.filter((r) => r.include).map((r) => r.id));
    const articlesToSummarize = (articles as Article[]).filter((a) => includedIds.has(a.id));

    if (articlesToSummarize.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          totalArticles: articles.length,
          excluded: excludedIds.length,
          curated: 0,
          summarized: 0,
        },
      });
    }

    // ── Step 2: 요약 ──────────────────────────────
    const summaries = await generateSummaries(articlesToSummarize, bodies);

    let updatedCount = 0;
    for (const summary of summaries) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          title: summary.title,
          summary_point1: summary.summary_point1,
          summary_point2: summary.summary_point2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', summary.id);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`기사 ${summary.id} 업데이트 실패:`, updateError);
      }
    }

    // 브리핑 상태 업데이트
    await supabase
      .from('briefings')
      .upsert(
        { date, status: 'published', article_count: updatedCount },
        { onConflict: 'date' }
      );

    return NextResponse.json({
      success: true,
      data: {
        date,
        totalArticles: articles.length,
        bodyScraped: bodies.size,
        excluded: excludedIds.length,
        curated: articlesToSummarize.length,
        summarized: updatedCount,
      },
    });
  } catch (error) {
    console.error('요약 생성 오류:', error);
    return NextResponse.json(
      { success: false, error: '요약 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 기사 목록의 본문을 병렬로 스크래핑한다.
 * 개당 7초 타임아웃, 5개 동시 처리한다.
 */
async function scrapeArticleBodies(articles: Article[]): Promise<Map<string, string>> {
  const bodyMap = new Map<string, string>();
  const CONCURRENCY = 5;
  const TIMEOUT_MS = 7000;

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
            bodyMap.set(article.id, scraped.body.substring(0, 2000));
          }
        } catch {
          // 스크래핑 실패 시 제목만으로 큐레이션/요약
        }
      })
    );
  }

  return bodyMap;
}
