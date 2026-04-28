'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '@/lib/types/roadmap';

type Props = {
  todo: Todo;
  onToggle: (id: string, isDone: boolean) => Promise<void>;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
};

export function TodoItem({ todo, onToggle, onEdit, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.content);
  const [optimisticDone, setOptimisticDone] = useState(todo.is_done);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  async function handleToggle() {
    const next = !optimisticDone;
    setOptimisticDone(next);
    await onToggle(todo.id, next);
  }

  async function handleEditSubmit() {
    const trimmed = editValue.trim();
    if (trimmed.length === 0) {
      setEditValue(todo.content);
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    if (trimmed !== todo.content) {
      await onEdit(todo.id, trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleEditSubmit();
    if (e.key === 'Escape') {
      setEditValue(todo.content);
      setIsEditing(false);
    }
  }

  return (
    <li ref={setNodeRef} style={style} className="group flex items-start gap-2">
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
        className="mt-1 shrink-0 cursor-grab touch-none p-0.5 text-zinc-300 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing dark:text-zinc-700"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
        </svg>
      </button>

      {/* 체크박스 */}
      <button
        onClick={() => void handleToggle()}
        aria-label={optimisticDone ? '완료 해제' : '완료 처리'}
        className={
          'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ' +
          (optimisticDone
            ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
            : 'border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500')
        }
      >
        {optimisticDone && (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6.5l2.5 2.5L10 3" />
          </svg>
        )}
      </button>

      {/* 내용 — 인라인 편집 */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => void handleEditSubmit()}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          title="더블클릭하면 편집"
          className={
            'flex-1 cursor-text select-none text-sm ' +
            (optimisticDone
              ? 'text-zinc-400 line-through dark:text-zinc-600'
              : 'text-zinc-700 dark:text-zinc-300')
          }
        >
          {todo.content}
        </span>
      )}

      {/* 액션 버튼 */}
      {!isEditing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => setIsEditing(true)}
            aria-label="편집"
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25l-3 .75.75-3L11.5 2.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            aria-label="삭제"
            className="rounded p-0.5 text-zinc-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M4 4l.8 9.2a.5.5 0 0 0 .5.45h5.4a.5.5 0 0 0 .5-.45L12 4" />
            </svg>
          </button>
        </div>
      )}
    </li>
  );
}
