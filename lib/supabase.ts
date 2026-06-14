import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 (브라우저용, 공개 키 사용)
 * 클라이언트 컴포넌트에서 사용한다.
 * @returns Supabase 클라이언트 인스턴스
 */
export function createBrowserClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Supabase 서버 클라이언트 (서비스 역할 키 사용)
 * API 라우트 및 서버 컴포넌트에서 사용한다.
 * RLS를 우회하여 모든 데이터에 접근 가능하다.
 * @returns Supabase 서버 클라이언트 인스턴스
 */
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}
