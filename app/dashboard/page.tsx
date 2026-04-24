import { redirect } from 'next/navigation';
import { signOut } from '@/app/login/actions';
import { createClient } from '@/lib/supabase/server';
import { SubmitButton } from '@/components/SubmitButton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미들웨어에서 가드하지만 타입 안전 + 직접 접근 방어
  if (!user) {
    redirect('/login');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    '사용자';

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
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              로그아웃
            </SubmitButton>
          </form>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          대시보드는 준비 중입니다. 곧 프로젝트·로드맵·투두를 이곳에서 관리할 수
          있어요.
        </section>
      </div>
    </main>
  );
}
