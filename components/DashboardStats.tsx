'use client';

import { useEffect, useState } from 'react';

type Stats = {
  streak: number;
  todayCount: number;
  totalTodos: number;
  doneTodos: number;
  tokenUsed: number;
  tokenLimit: number;
};

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/dashboard/stats?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => null);
  }, []);

  const progressPct =
    !stats || stats.totalTodos === 0
      ? 0
      : Math.round((stats.doneTodos / stats.totalTodos) * 100);

  const tokenPct = !stats
    ? 0
    : Math.round((stats.tokenUsed / stats.tokenLimit) * 100);

  const tokenRemaining = stats ? stats.tokenLimit - stats.tokenUsed : null;
  const isTokenLow = stats ? tokenPct >= 80 : false;

  return (
    <section className="flex flex-col gap-3">
      {/* 상단 3개 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 전체 진행률 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">전체 진행률</p>
          {stats ? (
            <>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {progressPct}
                <span className="text-sm font-normal text-zinc-400">%</span>
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                {stats.doneTodos} / {stats.totalTodos} 완료
              </p>
            </>
          ) : (
            <div className="h-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          )}
        </div>

        {/* 연속 개발일 */}
        <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">연속 개발일</p>
          {stats ? (
            <>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.streak}
                <span className="text-sm font-normal text-zinc-400">일</span>
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                {stats.streak === 0 ? '오늘 첫 투두를 완료해보세요' : '🔥 대단해요!'}
              </p>
            </>
          ) : (
            <div className="h-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          )}
        </div>

        {/* 오늘 완료 */}
        <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">오늘 완료</p>
          {stats ? (
            <>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.todayCount}
                <span className="text-sm font-normal text-zinc-400">개</span>
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                {stats.todayCount === 0 ? '오늘은 아직 없어요' : '잘 하고 있어요 👍'}
              </p>
            </>
          ) : (
            <div className="h-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          )}
        </div>
      </div>

      {/* AI 토큰 잔여량 */}
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">AI 토큰 잔여량</p>
          {stats && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {tokenRemaining?.toLocaleString()} / {stats.tokenLimit.toLocaleString()}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              isTokenLow
                ? 'bg-amber-400 dark:bg-amber-500'
                : 'bg-zinc-900 dark:bg-zinc-50'
            }`}
            style={{ width: stats ? `${100 - tokenPct}%` : '100%' }}
          />
        </div>
        {isTokenLow && (
          <p className="text-xs font-medium text-amber-500 dark:text-amber-400">
            ⚠️ 토큰이 20% 이하로 남았어요
          </p>
        )}
      </div>
    </section>
  );
}
