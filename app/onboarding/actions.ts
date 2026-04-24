'use server';

// 온보딩 완료 처리 (스택 선택 UI 는 후속 작업, 여기서는 플래그만 설정)

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 기존 user_metadata(구글 프로필: full_name, avatar_url 등)를 명시적으로 보존
  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      onboarded: true,
    },
  });

  if (error) {
    throw new Error(`온보딩 상태 저장 실패: ${error.message}`);
  }

  redirect('/dashboard');
}
