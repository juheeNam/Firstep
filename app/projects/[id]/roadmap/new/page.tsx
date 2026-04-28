import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoadmapCreator } from '@/components/RoadmapCreator';

export default async function RoadmapNewPage({
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

  // 프로젝트 소유 검증
  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    redirect('/dashboard');
  }

  // 이미 로드맵이 있으면 바로 보기로 이동
  const { count: existingBlocks } = await supabase
    .from('blocks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id);

  if (existingBlocks && existingBlocks > 0) {
    redirect(`/projects/${id}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Link
          href={`/projects/${id}`}
          className="w-fit text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 프로젝트로
        </Link>

        <header>
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            ROADMAP
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {project.title || '제목 없음'}
          </h1>
        </header>

        <RoadmapCreator projectId={project.id} projectTitle={project.title} />
      </div>
    </main>
  );
}
