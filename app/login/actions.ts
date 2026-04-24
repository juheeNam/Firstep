'use server';

// 구글 OAuth 시작 / 로그아웃 서버 액션

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// 허용된 내부 리다이렉트 경로만 통과 — open-redirect 방어
// URL 인코딩 우회 및 공백/제어 문자 차단
function sanitizeRedirect(value: string | null): string | null {
  if (!value) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/')) return null;
  if (decoded.startsWith('//')) return null;
  if (decoded.startsWith('/\\')) return null;
  if (/\s/.test(decoded)) return null;
  return decoded;
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();

  const origin = headersList.get('origin');
  if (!origin) {
    // Next.js Server Action 은 CSRF 방어로 Origin 을 강제하지만,
    // 예외적으로 누락된 경우 사용자에게 로그인 페이지 에러로 전달
    redirect('/login?error=missing_origin');
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

  if (error || !data?.url) {
    redirect('/login?error=oauth_init_failed');
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
