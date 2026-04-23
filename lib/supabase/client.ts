// 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export function createClient() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
