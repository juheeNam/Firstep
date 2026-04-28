import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const p = project as Pick<Project, 'id' | 'title' | 'idea_summary' | 'entry_level' | 'status' | 'created_at'>;

  // 로드맵 조회 — blocks 와 todos 를 한 번에 가져온다 (seq ASC)
  const { data: blocksData } = await supabase
    .from('blocks')
    .select('id, project_id, name, seq, created_at, updated_at, todos(id, block_id, content, is_done, seq, completed_at, created_at, updated_at)')
    .eq('project_id', p.id)
    .order('seq', { ascending: true });

  const blocks = (blocksData ?? []) as BlockWithTodos[];

  // 블록 내부 투두는 seq 정렬 보장 (Supabase nested 정렬은 문서적으로 보장 X)
  blocks.forEach(b => {
    b.todos.sort((a, c) => a.seq - c.seq);
  });

  const totalTodos     = blocks.reduce((acc, b) => acc + b.todos.length, 0);
  const completedTodos = blocks.reduce(
    (acc, b) => acc + b.todos.filter(t => t.is_done).length,
    0,
  );
  const progressPct = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

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
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {p.title || '제목 없음'}
          </h1>
          {p.idea_summary && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {p.idea_summary}
            </p>
          )}
        </header>

        {blocks.length === 0 ? (
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
        ) : (
          <>
            {/* 진행률 — 가벼운 미니 표시 (대시보드는 §4.6에서 구현) */}
            <section
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              aria-label="진행률"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>진행률</span>
                <span>
                  {completedTodos} / {totalTodos} ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              {blocks.map((block, blockIdx) => (
                <article
                  key={block.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <header className="flex items-baseline gap-3">
                    <span className="text-xs font-medium tracking-wider text-zinc-400 dark:text-zinc-500">
                      {String(blockIdx + 1).padStart(2, '0')}
                    </span>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {block.name}
                    </h2>
                  </header>
                  <ul className="flex flex-col gap-1.5">
                    {block.todos.map(todo => (
                      <li
                        key={todo.id}
                        className="flex items-start gap-3 rounded-lg px-2 py-1.5"
                      >
                        <span
                          aria-hidden
                          className={
                            'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ' +
                            (todo.is_done
                              ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                              : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950')
                          }
                        >
                          {todo.is_done && (
                            <svg
                              viewBox="0 0 12 12"
                              className="h-2.5 w-2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 6.5l2.5 2.5L10 3" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={
                            'text-sm ' +
                            (todo.is_done
                              ? 'text-zinc-400 line-through dark:text-zinc-600'
                              : 'text-zinc-700 dark:text-zinc-300')
                          }
                        >
                          {todo.content}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
