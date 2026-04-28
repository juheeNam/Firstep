'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAnthropicClient, MODELS } from '@/lib/claude/index';
import type { IntentDataLevel2, ProjectSummaryResult, EntryLevel } from '@/lib/types/projects';

// profiles 행 보장 (기존 가입자 FK 위반 방지)
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

// Claude Haiku 로 기획 요약(title + idea_summary) 생성
export async function generateProjectSummary(
  intentData: IntentDataLevel2,
): Promise<ProjectSummaryResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const client = createAnthropicClient();

  const prompt = `사이드프로젝트 기획 정보를 바탕으로 프로젝트 제목과 기획 요약을 JSON으로만 작성하세요.

[유저 입력]
- 서비스 설명: ${intentData.q1Text}
- 프로젝트 형태: ${intentData.q2Form}
- 인증/개인화: ${intentData.q3Auth}
- 외부 통합: ${intentData.q4Integrations.join(', ')}
- 공개 범위: ${intentData.q5Audience}

응답은 아래 JSON 형식만 출력하세요. 설명이나 마크다운 없이 JSON만:
{"title":"20자 이내 한국어 제목","idea_summary":"100~200자 한국어 기획 요약"}`;

  try {
    const message = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    // JSON 블록 추출 (마크다운 코드블록 방어)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'JSON 파싱 실패' };

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (typeof parsed.title !== 'string' || typeof parsed.idea_summary !== 'string') {
      return { error: '응답 형식 오류' };
    }

    const title = parsed.title.trim().slice(0, 50);
    const ideaSummary = parsed.idea_summary.trim();
    if (title.length === 0 || ideaSummary.length < 10) {
      return { error: '응답 형식 오류' };
    }

    return { title, ideaSummary };
  } catch (err) {
    console.error('[generateProjectSummary] Claude 호출 실패', err);
    return { error: 'AI 요약 생성에 실패했어요. 다시 시도해주세요.' };
  }
}

// 프로젝트 DB 저장 후 /projects/[id] 로 이동
export async function createProject(data: {
  title: string;
  ideaSummary: string;
  entryLevel: EntryLevel;
  intentData: IntentDataLevel2;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profileError = await ensureProfile(supabase, user);
  if (profileError) {
    console.error('[createProject] profiles upsert 실패', profileError);
    redirect('/projects/new/level-2?error=save_failed');
  }

  const trimmedTitle = data.title.trim();

  // 이슈 5: 뒤로가기·연타로 동일 입력이 두 번 제출되어 새 프로젝트가 중복 생성되는 것 방지.
  //         최근 5분 내 같은 user + title + entry_level 의 active 프로젝트가 있으면 그쪽으로 이동.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id',     user.id)
    .eq('title',       trimmedTitle)
    .eq('entry_level', data.entryLevel)
    .gt('created_at',  fiveMinAgo)
    .is('deleted_at',  null)
    .limit(1)
    .maybeSingle();

  if (recent?.id) {
    redirect(`/projects/${recent.id}/roadmap/new`);
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id:      user.id,
      title:        trimmedTitle,
      idea_summary: data.ideaSummary.trim(),
      entry_level:  data.entryLevel,
      intent_data:  data.intentData,
      status:       'active',
    })
    .select('id')
    .single();

  if (error || !project) {
    console.error('[createProject] insert 실패', error);
    redirect('/projects/new/level-2?error=save_failed');
  }

  redirect(`/projects/${project.id}/roadmap/new`);
}
