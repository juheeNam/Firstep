import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { LevelMeta } from '@/lib/types/projects';

const LEVEL_META: LevelMeta[] = [
  {
    level: 1,
    emoji: '🌱',
    title: '아직 아이디어가 없어요',
    description: '막연한 관심만 있어도 괜찮아요. AI가 질문으로 아이디어를 함께 찾아드려요.',
    href: '/projects/new/level-1',
  },
  {
    level: 2,
    emoji: '💡',
    title: '대략적인 아이디어가 있어요',
    description: '만들고 싶은 컨셉이 있으신가요? 5가지 질문으로 기획을 구체화해드려요.',
    href: '/projects/new/level-2',
  },
  {
    level: 3,
    emoji: '📋',
    title: '구체적인 기획이 있어요',
    description: '상세 계획이 있으시면 자유롭게 서술해주세요. AI가 빠르게 로드맵으로 만들어드려요.',
    href: '/projects/new/level-3',
  },
];

export default async function NewProjectPage() {
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
          href="/dashboard"
          className="w-fit text-xs text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 대시보드로
        </Link>

        <header>
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            NEW PROJECT
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            어떤 단계에 계신가요?
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            현재 아이디어 구체화 수준을 선택해주세요. AI가 그에 맞는 방식으로 도와드려요.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {LEVEL_META.map(({ level, emoji, title, description, href }) => (
            <Link
              key={level}
              href={href}
              className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:focus-visible:ring-zinc-50"
            >
              <span className="shrink-0 text-3xl">{emoji}</span>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
              <span className="shrink-0 text-xl text-zinc-400 dark:text-zinc-600">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
