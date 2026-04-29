// 대시보드 통계 API
// GET /api/dashboard/stats?tz=Asia/Seoul
// 반환: streak, todayCount, totalTodos, doneTodos, tokenUsed, tokenLimit

import { createClient } from '@/lib/supabase/server';

// 무료 플랜 토큰 한도 (베타 후 확정 예정)
const FREE_TOKEN_LIMIT = 100_000;

// YYYY-MM-DD 형태로 날짜 반환 (sv-SE 로케일은 ISO 형식)
function toLocalDateStr(date: Date, tz: string): string {
  try {
    return date.toLocaleDateString('sv-SE', { timeZone: tz });
  } catch {
    return date.toLocaleDateString('sv-SE', { timeZone: 'UTC' });
  }
}

function calcStreak(completedDates: string[], tz: string): number {
  const daySet = new Set(
    completedDates.map(d => toLocalDateStr(new Date(d), tz)),
  );

  let streak = 0;
  const cursor = new Date();

  // 오늘부터 하루씩 역산하며 연속일 계산
  while (true) {
    const dayStr = toLocalDateStr(cursor, tz);
    if (!daySet.has(dayStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tz = searchParams.get('tz') ?? 'UTC';

  // 완료된 투두의 completed_at 전체 조회 (스트릭·오늘 계산용)
  const { data: completedTodos } = await supabase
    .from('todos')
    .select('completed_at, blocks(projects(user_id))')
    .eq('is_done', true)
    .not('completed_at', 'is', null);

  // RLS로 본인 투두만 오지만, 혹시 모를 조인 필터도 적용
  const completedDates = ((completedTodos ?? []) as {
    completed_at: string;
    blocks: { projects: { user_id: string }[] }[] ;
  }[])
    .filter(t => t.blocks?.[0]?.projects?.[0]?.user_id === user.id)
    .map(t => t.completed_at as string);

  const todayStr = toLocalDateStr(new Date(), tz);
  const todayCount = completedDates.filter(
    d => toLocalDateStr(new Date(d), tz) === todayStr,
  ).length;

  const streak = calcStreak(completedDates, tz);

  // 전체 프로젝트 투두 집계 (삭제된 프로젝트 제외)
  const { data: blocks } = await supabase
    .from('blocks')
    .select('todos(is_done), projects(deleted_at)')
    .not('projects', 'is', null);

  type BlockRow = {
    todos: { is_done: boolean }[];
    projects: { deleted_at: string | null }[];
  };

  const activeBlocks = ((blocks ?? []) as BlockRow[]).filter(
    b => b.projects?.[0]?.deleted_at === null,
  );
  const allTodos = activeBlocks.flatMap(b => b.todos);
  const totalTodos = allTodos.length;
  const doneTodos = allTodos.filter(t => t.is_done).length;

  // AI 토큰 사용량 집계
  const { data: usageRows } = await supabase
    .from('ai_usage')
    .select('tokens_delta')
    .eq('user_id', user.id);

  const tokenUsed = (usageRows ?? []).reduce(
    (sum, r) => sum + (r.tokens_delta as number),
    0,
  );

  return Response.json({
    streak,
    todayCount,
    totalTodos,
    doneTodos,
    tokenUsed: Math.max(0, tokenUsed),
    tokenLimit: FREE_TOKEN_LIMIT,
  });
}
