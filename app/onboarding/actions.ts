'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { StackEntry } from '@/lib/types/stacks';

// 나중에 하기 버튼: 스택 저장 없이 온보딩 완료 플래그만 설정
export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      onboarded: true,
    },
  });

  if (error) {
    console.error('[onboarding] updateUser 실패', error);
    redirect('/onboarding?error=save_failed');
  }

  redirect('/dashboard');
}

// 저장하기 버튼: 스택 선택 결과를 user_stacks 에 upsert 후 온보딩 완료 처리
export async function saveUserStacks(entries: StackEntry[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 기존 auth.users 유저에 대한 profiles 행 보장 (트리거 미적용 대상 처리)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id:         user.id,
      email:      user.email,
      full_name:  user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('[saveUserStacks] profiles upsert 실패', profileError);
    redirect('/onboarding?error=save_failed');
  }

  if (entries.length > 0) {
    const rows = entries.map(({ category, techName, status }) => ({
      user_id:    user.id,
      category,
      tech_name:  techName,
      status,
      updated_at: new Date().toISOString(),
    }));

    const { error: stacksError } = await supabase
      .from('user_stacks')
      .upsert(rows, { onConflict: 'user_id,category,tech_name' });

    if (stacksError) {
      console.error('[saveUserStacks] user_stacks upsert 실패', stacksError);
      redirect('/onboarding?error=save_failed');
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      onboarded: true,
    },
  });

  if (updateError) {
    console.error('[saveUserStacks] updateUser 실패', updateError);
    redirect('/onboarding?error=save_failed');
  }

  redirect('/dashboard');
}
