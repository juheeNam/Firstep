// 서버 컴포넌트 / Route Handler / Server Action 에서 사용하는 Supabase 클라이언트

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 에서는 쿠키 set 이 불가능하므로 무시
          // 미들웨어에서 세션 갱신을 처리하면 문제 없음
        }
      },
    },
  });
}
