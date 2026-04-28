import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/lib/types/projects';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, idea_summary, entry_level, status, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    redirect('/dashboard');
  }

  const p = project as Pick<Project, 'id' | 'title' | 'idea_summary' | 'entry_level' | 'status' | 'created_at'>;

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Link
          href="/dashboard"
          className="w-fit text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 대시보드로
        </Link>

        <header>
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            PROJECT
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {p.title || '제목 없음'}
          </h1>
          {p.idea_summary && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {p.idea_summary}
            </p>
          )}
        </header>

        <section className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <div className="text-3xl">🗺️</div>
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              로드맵 생성 기능이 곧 연결돼요
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              프로젝트가 저장됐어요. 로드맵 생성은 다음 업데이트에서 구현됩니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
