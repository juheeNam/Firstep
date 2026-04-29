import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoadmapView } from '@/components/RoadmapView';
import type { Project } from '@/lib/types/projects';
import type { BlockWithTodos } from '@/lib/types/roadmap';

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

  const p = project as Pick<
    Project,
    'id' | 'title' | 'idea_summary' | 'entry_level' | 'status' | 'created_at'
  >;

  const { data: blocksData } = await supabase
    .from('blocks')
    .select(
      'id, project_id, name, seq, created_at, updated_at, todos(id, block_id, content, is_done, seq, completed_at, created_at, updated_at)',
    )
    .eq('project_id', p.id)
    .order('seq', { ascending: true });

  const blocks = (blocksData ?? []) as BlockWithTodos[];
  blocks.forEach(b => {
    b.todos.sort((a, c) => a.seq - c.seq);
  });

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-8">
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
          {p.idea_summary && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {p.idea_summary}
            </p>
          )}
        </header>

        {blocks.length === 0 ? (
          <>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {p.title || '제목 없음'}
            </h1>
            <section className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <div className="text-3xl">🗺️</div>
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  아직 로드맵이 없어요
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  AI가 기획을 바탕으로 블록과 투두를 만들어드려요.
                </p>
              </div>
              <Link
                href={`/projects/${p.id}/roadmap/new`}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                로드맵 만들기
              </Link>
            </section>
          </>
        ) : (
          <RoadmapView
            projectId={p.id}
            initialTitle={p.title || '제목 없음'}
            initialBlocks={blocks}
            initialStatus={p.status}
          />
        )}
      </div>
    </main>
  );
}
