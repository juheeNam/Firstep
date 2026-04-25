import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Level2Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Link
          href="/projects/new"
          className="w-fit text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 레벨 선택으로
        </Link>

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
        </header>

        <section className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AI 대화 기능이 곧 연결돼요. 지금은 레벨 선택까지만 동작합니다.
          </p>
          <Link
            href="/projects/new"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← 다른 레벨 선택하기
          </Link>
        </section>
      </div>
    </main>
  );
}
