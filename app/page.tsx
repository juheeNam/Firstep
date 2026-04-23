export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="rounded-full bg-zinc-900/5 px-4 py-1 text-xs font-medium tracking-wider text-zinc-600 dark:bg-zinc-50/10 dark:text-zinc-300">
          SIDE PROJECT LAUNCHPAD
        </span>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          아이디어에서 출시까지,
          <br />
          <span className="text-zinc-500 dark:text-zinc-400">Firstep</span>
        </h1>

        <p className="max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
          두루뭉실한 아이디어만 있어도 괜찮아요. AI가 아이디어를 단계별 개발
          로드맵으로 만들어주고, 완료까지 옆에서 가이드합니다.
        </p>

        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          title="곧 연결될 예정입니다"
        >
          구글로 시작하기
          <span className="text-xs font-normal opacity-70">(준비 중)</span>
        </button>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          MVP 개발 중 · 8주 목표
        </p>
      </div>
    </main>
  );
}
