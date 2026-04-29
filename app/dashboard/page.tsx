import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/login/actions';
import { createClient } from '@/lib/supabase/server';
import { SubmitButton } from '@/components/SubmitButton';
import { ProjectList } from '@/components/ProjectList';
import { DashboardStats } from '@/components/DashboardStats';
import type { ProjectCardData } from '@/components/ProjectCard';
import type { ProjectStatus } from '@/lib/types/projects';

// Supabase 조인 응답 타입
type ProjectRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  updated_at: string;
  blocks: {
    todos: { is_done: boolean }[];
  }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    '사용자';

  // 프로젝트 + 투두 진행률 조회 (소프트 딜리트 제외, 최신순)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, updated_at, blocks(todos(is_done))')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(20);

  const projectList: ProjectCardData[] = ((projects ?? []) as ProjectRow[]).map(p => {
    const allTodos = p.blocks.flatMap(b => b.todos);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      updated_at: p.updated_at,
      totalTodos: allTodos.length,
      doneTodos: allTodos.filter(t => t.is_done).length,
    };
  });

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
              DASHBOARD
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              안녕하세요, {displayName} 님
            </h1>
          </div>
          <form action={signOut}>
            <SubmitButton
              pendingLabel="로그아웃 중..."
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              로그아웃
            </SubmitButton>
          </form>
        </header>

        {/* 통계 위젯 (§4.6) — 항상 표시 */}
        <DashboardStats />

        {projectList.length === 0 ? (
          // 빈 상태 (§4.8)
          <section className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
            <div className="text-4xl">🌱</div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                첫 프로젝트를 시작해볼까요?
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                아이디어가 없어도 괜찮아요. AI가 도와드릴게요.
              </p>
            </div>
            <Link
              href="/projects/new"
              className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              새 프로젝트 만들기
            </Link>
          </section>
        ) : (
          // 프로젝트 목록 (§4.7.1)
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                내 프로젝트 ({projectList.length})
              </h2>
              <Link
                href="/projects/new"
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                + 새 프로젝트
              </Link>
            </div>
            <ProjectList initialProjects={projectList} />
          </section>
        )}
      </div>
    </main>
  );
}
