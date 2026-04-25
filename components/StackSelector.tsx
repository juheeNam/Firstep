'use client';

import { useState, useTransition } from 'react';
import { completeOnboarding, saveUserStacks } from '@/app/onboarding/actions';
import { CATEGORY_META, STACKS, STATUS_CYCLE, STATUS_LABEL } from '@/lib/stacks';
import { SubmitButton } from '@/components/SubmitButton';
import type {
  StackCategory,
  StackStatus,
  StackSelectionState,
  SelectionMap,
  StackEntry,
} from '@/lib/types/stacks';

type Props = {
  // 마이페이지 재편집 시 기존 저장값 전달
  initialSelections?: StackEntry[];
};

export function StackSelector({ initialSelections = [] }: Props) {
  const [activeCategory, setActiveCategory] = useState<StackCategory>('frontend');
  const [selections, setSelections] = useState<SelectionMap>(() => {
    const m = new Map<string, StackStatus>();
    for (const e of initialSelections) {
      m.set(`${e.category}:${e.techName}`, e.status);
    }
    return m;
  });
  const [isPending, startTransition] = useTransition();

  function cycleStatus(category: StackCategory, techName: string) {
    const key = `${category}:${techName}`;
    const current: StackSelectionState = selections.get(key) ?? null;
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];

    setSelections(prev => {
      const updated = new Map(prev);
      if (next === null) {
        updated.delete(key);
      } else {
        updated.set(key, next);
      }
      return updated;
    });
  }

  function handleSave() {
    const entries: StackEntry[] = [];
    selections.forEach((status, key) => {
      const colonIdx = key.indexOf(':');
      const category = key.slice(0, colonIdx) as StackCategory;
      const techName = key.slice(colonIdx + 1);
      entries.push({ category, techName, status });
    });
    startTransition(async () => {
      await saveUserStacks(entries);
    });
  }

  const selectedCount = selections.size;

  return (
    <div className="flex flex-col gap-6">
      {/* 카테고리 탭 */}
      <div
        role="tablist"
        aria-label="기술 스택 카테고리"
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-0 dark:border-zinc-800"
      >
        {CATEGORY_META.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={activeCategory === id}
            onClick={() => setActiveCategory(id)}
            className={
              'shrink-0 rounded-t px-4 py-2 text-sm font-medium transition-colors ' +
              (activeCategory === id
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* 기술 그리드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {STACKS[activeCategory].map(techName => {
          const key = `${activeCategory}:${techName}`;
          const status = selections.get(key) ?? null;
          return (
            <TechChip
              key={key}
              techName={techName}
              status={status}
              onClick={() => cycleStatus(activeCategory, techName)}
            />
          );
        })}
      </div>

      {/* 선택 현황 */}
      {selectedCount > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedCount}개 선택됨
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <form action={completeOnboarding}>
          <SubmitButton
            pendingLabel="이동 중..."
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            나중에 하기
          </SubmitButton>
        </form>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}

// 개별 기술 칩 컴포넌트
type TechChipProps = {
  techName: string;
  status: StackSelectionState;
  onClick: () => void;
};

function TechChip({ techName, status, onClick }: TechChipProps) {
  const base =
    'flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50';

  const variants: Record<string, string> = {
    null:           'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600',
    used:           'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-300',
    want:           'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    not_interested: 'border-zinc-300 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600',
  };

  const badgeVariants: Record<string, string> = {
    used:           'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    want:           'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
    not_interested: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  };

  const statusKey = status ?? 'null';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variants[statusKey]}`}
    >
      <span className="font-medium leading-snug">{techName}</span>
      {status !== null && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeVariants[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      )}
    </button>
  );
}
