import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Level2Flow } from '@/components/Level2Flow';

type SearchParams = Promise<{ error?: string }>;

export default async function Level2Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header>
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            LEVEL 2
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              대략적인 아이디어가 있어요
            </h1>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            5가지 질문에 답하면 AI가 기획 요약을 만들어드려요.
          </p>
        </header>

        <Level2Flow errorCode={params.error} />
      </div>
    </main>
  );
}
