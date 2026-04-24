import { redirect } from 'next/navigation';
import { completeOnboarding } from '@/app/onboarding/actions';
import { signOut } from '@/app/login/actions';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 이미 온보딩을 마친 유저의 재진입 차단 — URL 직접 입력 또는 next 파라미터 우회 방어
  if (user.user_metadata?.onboarded) {
    redirect('/dashboard');
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <header>
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            ONBOARDING
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            환영합니다!
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            기술 스택 선택 UI 는 준비 중이에요. 지금은 건너뛰고 바로 대시보드로
            이동할 수 있어요.
          </p>
        </header>

        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          곧 5개 카테고리(프론트엔드 / 백엔드 / DB / 인프라 / 보안)에서 써봤거나
          관심 있는 스택을 선택하도록 안내할 예정입니다.
        </section>

        <div className="flex items-center justify-between gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              로그아웃
            </button>
          </form>
          <form action={completeOnboarding}>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              건너뛰고 시작하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
