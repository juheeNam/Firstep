'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAnthropicClient, MODELS } from '@/lib/claude/index';
import type {
  IntentDataLevel1,
  ProjectSummaryResult,
  FollowUpQuestionsResult,
} from '@/lib/types/projects';

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

// 고정 3개 질문 답변을 바탕으로 AI 후속 질문 2~4개 생성
export async function generateLevel1FollowUpQuestions(
  q1: string,
  q2: string,
  q3: string,
): Promise<FollowUpQuestionsResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const client = createAnthropicClient();

  const prompt = `유저가 사이드프로젝트 아이디어를 발굴하기 위해 세 가지 페인포인트 질문에 답했습니다.
이 답변을 바탕으로 구체적인 프로젝트 아이디어를 발전시키기 위한 후속 질문 2~4개를 JSON으로 작성하세요.

[질문 1] 요즘 일상에서 제일 귀찮거나 불편한 게 뭐예요?
<user_input>
${q1.trim().slice(0, 500)}
</user_input>

[질문 2] 주변에서 자주 듣는 불평이 뭐예요?
<user_input>
${q2.trim().slice(0, 500)}
</user_input>

[질문 3] 반복적으로 하는 일 중에 자동화하고 싶은 게 있나요?
<user_input>
${q3.trim().slice(0, 500)}
</user_input>

응답은 아래 JSON 형식만 출력하세요. 설명이나 마크다운 없이 JSON만:
{"questions":["질문1","질문2"]}`;

  try {
    const message = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'JSON 파싱 실패' };

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (
      !Array.isArray(parsed.questions) ||
      parsed.questions.length < 1 ||
      parsed.questions.some((q: unknown) => typeof q !== 'string')
    ) {
      return { error: '응답 형식 오류' };
    }

    const questions = (parsed.questions as string[]).slice(0, 4);
    if (questions.length < 2) return { error: '응답 형식 오류' };
    return { questions };
  } catch (err) {
    console.error('[generateLevel1FollowUpQuestions] Claude 호출 실패', err);
    return { error: 'AI 질문 생성에 실패했어요. 다시 시도해주세요.' };
  }
}

// 페인포인트 답변 + 후속 Q&A 바탕으로 기획 요약 생성
export async function generateLevel1Summary(
  data: IntentDataLevel1,
): Promise<ProjectSummaryResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const client = createAnthropicClient();

  const qaPart = data.followUpQAs.length > 0
    ? data.followUpQAs
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer.trim()}`)
        .join('\n\n')
    : '(없음)';

  const prompt = `유저가 페인포인트 발굴 과정에서 나눈 대화를 바탕으로 사이드프로젝트 제목과 기획 요약을 JSON으로만 작성하세요.

[페인포인트 답변]
Q: 요즘 일상에서 제일 귀찮거나 불편한 게 뭐예요?
<user_input>
${data.q1.trim().slice(0, 500)}
</user_input>

Q: 주변에서 자주 듣는 불평이 뭐예요?
<user_input>
${data.q2.trim().slice(0, 500)}
</user_input>

Q: 반복적으로 하는 일 중에 자동화하고 싶은 게 있나요?
<user_input>
${data.q3.trim().slice(0, 500)}
</user_input>

[추가 질의응답]
${qaPart}

응답은 아래 JSON 형식만 출력하세요. 설명이나 마크다운 없이 JSON만:
{"title":"20자 이내 한국어 제목","idea_summary":"100~200자 한국어 기획 요약"}`;

  try {
    const message = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
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
    console.error('[generateLevel1Summary] Claude 호출 실패', err);
    return { error: 'AI 요약 생성에 실패했어요. 다시 시도해주세요.' };
  }
}

// 프로젝트 DB 저장 후 /projects/[id]/roadmap/new 로 이동
export async function createLevel1Project(data: {
  title: string;
  ideaSummary: string;
  intentData: IntentDataLevel1;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profileError = await ensureProfile(supabase, user);
  if (profileError) {
    console.error('[createLevel1Project] profiles upsert 실패', profileError);
    redirect('/projects/new/level-1?error=save_failed');
  }

  const trimmedTitle = data.title.trim();

  // 최근 5분 내 동일 title+entry_level=1 중복 생성 방지
  if (trimmedTitle.length > 0) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id',     user.id)
      .eq('title',       trimmedTitle)
      .eq('entry_level', 1)
      .is('size_option', null)
      .is('deleted_at',  null)
      .gt('created_at',  fiveMinAgo)
      .limit(1)
      .maybeSingle();

    if (recent?.id) {
      redirect(`/projects/${recent.id}/roadmap/new`);
    }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id:      user.id,
      title:        trimmedTitle,
      idea_summary: data.ideaSummary.trim(),
      entry_level:  1,
      intent_data:  data.intentData,
      status:       'active',
    })
    .select('id')
    .single();

  if (error || !project) {
    console.error('[createLevel1Project] insert 실패', error);
    redirect('/projects/new/level-1?error=save_failed');
  }

  redirect(`/projects/${project.id}/roadmap/new`);
}
