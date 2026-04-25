'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { STACKS } from '@/lib/stacks';
import type { StackEntry, StackCategory, StackStatus } from '@/lib/types/stacks';

const VALID_CATEGORIES = new Set<StackCategory>(['frontend', 'backend', 'db', 'infra', 'security']);
const VALID_STATUSES = new Set<StackStatus>(['used', 'want', 'not_interested']);
const MAX_ENTRIES = 50;

// profiles 행 보장 헬퍼 — 트리거 미적용 기존 가입자 대응
async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id:         user.id,
      email:      user.email,
      full_name:  (user.user_metadata?.full_name as string) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    },
    { onConflict: 'id' },
  );
  return error;
}

// 나중에 하기 버튼: 스택 저장 없이 온보딩 완료 플래그만 설정
export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 마이페이지 재편집 시 FK 위반 방지를 위해 profiles 행 보장
  const profileError = await ensureProfile(supabase, user);
  if (profileError) {
    console.error('[completeOnboarding] profiles upsert 실패', profileError);
    redirect('/onboarding?error=save_failed');
  }

  const { error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, onboarded: true },
  });

  if (error) {
    console.error('[completeOnboarding] updateUser 실패', error);
    redirect('/onboarding?error=save_failed');
  }

  redirect('/dashboard');
}

// 저장하기 버튼: 스택 선택 결과를 user_stacks 에 upsert 후 온보딩 완료 처리
export async function saveUserStacks(entries: StackEntry[]) {
  // 서버 측 입력 검증: 항목 수·카테고리·기술명·상태 모두 허용 목록 대조
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) {
    redirect('/onboarding?error=save_failed');
  }

  for (const entry of entries) {
    const category = entry.category as StackCategory;
    if (!VALID_CATEGORIES.has(category)) {
      redirect('/onboarding?error=save_failed');
    }
    if (!VALID_STATUSES.has(entry.status as StackStatus)) {
      redirect('/onboarding?error=save_failed');
    }
    if (!STACKS[category].includes(entry.techName)) {
      redirect('/onboarding?error=save_failed');
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 기존 auth.users 유저에 대한 profiles 행 보장
  const profileError = await ensureProfile(supabase, user);
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
    data: { ...user.user_metadata, onboarded: true },
  });

  if (updateError) {
    console.error('[saveUserStacks] updateUser 실패', updateError);
    redirect('/onboarding?error=save_failed');
  }

  redirect('/dashboard');
}
