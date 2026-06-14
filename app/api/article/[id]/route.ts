import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ArticleUpdate } from '@/types/news';

/**
 * 개별 기사 수정 API
 * PATCH /api/article/[id]
 * body: { title?, summary_point1?, summary_point2?, is_excluded? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ArticleUpdate;

    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.summary_point1 !== undefined)
      updateData.summary_point1 = body.summary_point1;
    if (body.summary_point2 !== undefined)
      updateData.summary_point2 = body.summary_point2;
    if (body.is_excluded !== undefined) updateData.is_excluded = body.is_excluded;

    const { data: article, error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('기사 수정 실패:', error);
      return NextResponse.json(
        { success: false, error: '기사 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('기사 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '기사 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
