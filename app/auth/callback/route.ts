// OAuth 콜백 — 구글에서 리다이렉트되어 들어오는 코드/에러를 처리하고 세션 발급

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 허용된 내부 리다이렉트 경로만 통과 — open-redirect 방어
// URL 인코딩 우회 및 공백/제어 문자 차단
function safeNext(value: string | null): string | null {
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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = safeNext(searchParams.get('next'));
  const oauthError = searchParams.get('error');

  // 사용자가 구글 창에서 거부했거나 OAuth 오류 반환
  if (oauthError) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'exchange_failed');
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'exchange_failed');
    return NextResponse.redirect(url);
  }

  // 로그인 후 분기: 명시적 redirect 가 있으면 그곳으로, 없으면 온보딩 여부로 분기
  if (nextParam) {
    return NextResponse.redirect(new URL(nextParam, origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const onboarded = Boolean(user?.user_metadata?.onboarded);
  const destination = onboarded ? '/dashboard' : '/onboarding';
  return NextResponse.redirect(new URL(destination, origin));
}
