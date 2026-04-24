'use server';

// 구글 OAuth 시작 / 로그아웃 서버 액션

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// 허용된 내부 리다이렉트 경로만 통과시키기 (open-redirect 방어)
function sanitizeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();

  const origin = headersList.get('origin');
  if (!origin) {
    throw new Error('Origin 헤더를 확인할 수 없습니다.');
  }

  const redirectParam = sanitizeRedirect(
    formData.get('redirect') as string | null,
  );
  const callbackUrl = new URL('/auth/callback', origin);
  if (redirectParam) {
    callbackUrl.searchParams.set('next', redirectParam);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      // 최소 스코프 (이메일 + 기본 프로필)
      scopes: 'openid email profile',
    },
  });

  if (error) {
    throw new Error(`구글 로그인 초기화 실패: ${error.message}`);
  }

  if (!data.url) {
    throw new Error('OAuth 리다이렉트 URL 이 발급되지 않았습니다.');
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
