'use client';

// Server Action form 제출 상태에 따른 pending 처리 (중복 클릭 방지)

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        (className ??
          'flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200') +
        ' disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      {pending ? (pendingLabel ?? '연결 중...') : children}
    </button>
  );
}
