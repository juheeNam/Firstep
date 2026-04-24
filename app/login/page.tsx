import Link from 'next/link';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

type SearchParams = Promise<{
  redirect?: string;
  error?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const redirectPath = params.redirect;
  const errorCode = params.error;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Link
          href="/"
          className="text-xs font-medium tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Firstep
        </Link>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            로그인
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            구글 계정으로 몇 초 만에 시작할 수 있어요.
          </p>
        </div>

        {errorCode ? (
          <div
            role="alert"
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {mapErrorMessage(errorCode)}
          </div>
        ) : null}

        <GoogleSignInButton redirectPath={redirectPath} />

        <p className="max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          로그인 시 이메일과 기본 프로필 정보만 수집합니다. 언제든 로그아웃할 수
          있어요.
        </p>
      </div>
    </main>
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'oauth_denied':
      return '구글 로그인 창에서 취소되었습니다. 다시 시도해 주세요.';
    case 'exchange_failed':
      return '세션 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.';
  }
}
