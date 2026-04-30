import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Level1Flow } from '@/components/Level1Flow';

export default async function Level1Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { error } = await searchParams;

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
            LEVEL 1
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              아직 아이디어가 없어요
            </h1>
          </div>
        </header>

        <Level1Flow errorCode={error} />
      </div>
    </main>
  );
}
