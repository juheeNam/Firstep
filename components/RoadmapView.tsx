'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { TodoItem } from '@/components/TodoItem';
import type { BlockWithTodos, Todo } from '@/lib/types/roadmap';

type Props = {
  initialBlocks: BlockWithTodos[];
};

type DeleteTarget = { id: string; content: string };

export function RoadmapView({ initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<BlockWithTodos[]>(initialBlocks);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [addingBlockId, setAddingBlockId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── 체크박스 토글 ──────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (todoId: string, isDone: boolean) => {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: isDone }),
    });
    setBlocks(prev =>
      prev.map(b => ({
        ...b,
        todos: b.todos.map(t =>
          t.id === todoId
            ? { ...t, is_done: isDone, completed_at: isDone ? new Date().toISOString() : null }
            : t,
        ),
      })),
    );
  }, []);

  // ── 인라인 편집 ────────────────────────────────────────────────────────────
  const handleEdit = useCallback(async (todoId: string, content: string) => {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setBlocks(prev =>
      prev.map(b => ({
        ...b,
        todos: b.todos.map(t => (t.id === todoId ? { ...t, content } : t)),
      })),
    );
  }, []);

  // ── 삭제 확인 모달 요청 ────────────────────────────────────────────────────
  const handleDeleteRequest = useCallback((todoId: string) => {
    setBlocks(prev => {
      for (const b of prev) {
        const t = b.todos.find(t => t.id === todoId);
        if (t) {
          setDeleteTarget({ id: todoId, content: t.content });
          return prev;
        }
      }
      return prev;
    });
  }, []);

  // ── 삭제 확정 ──────────────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    setBlocks(prev =>
      prev.map(b => ({ ...b, todos: b.todos.filter(t => t.id !== id) })),
    );
  }

  // ── 드래그 앤 드롭 ─────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent, blockId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockId) return b;
        const oldIndex = b.todos.findIndex(t => t.id === active.id);
        const newIndex = b.todos.findIndex(t => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return b;
        const reordered = arrayMove(b.todos, oldIndex, newIndex);
        const orderedIds = reordered.map(t => t.id);
        // 서버 seq 업데이트 (fire-and-forget)
        void fetch(`/api/blocks/${blockId}/todos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds }),
        });
        return { ...b, todos: reordered };
      }),
    );
  }

  // ── 투두 추가 ──────────────────────────────────────────────────────────────
  async function handleAddTodo(blockId: string) {
    const content = newContent.trim();
    if (!content) return;
    setNewContent('');
    setAddingBlockId(null);

    const res = await fetch(`/api/blocks/${blockId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const { todo } = (await res.json()) as { todo: Todo };
    setBlocks(prev =>
      prev.map(b =>
        b.id === blockId ? { ...b, todos: [...b.todos, todo] } : b,
      ),
    );
  }

  // ── 진행률 계산 ────────────────────────────────────────────────────────────
  const totalTodos = blocks.reduce((a, b) => a + b.todos.length, 0);
  const doneTodos = blocks.reduce((a, b) => a + b.todos.filter(t => t.is_done).length, 0);
  const progressPct = totalTodos === 0 ? 0 : Math.round((doneTodos / totalTodos) * 100);

  return (
    <>
      {/* 진행률 바 */}
      <section
        className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="진행률"
      >
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>진행률</span>
          <span>
            {doneTodos} / {totalTodos} ({progressPct}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* 블록 목록 */}
      <section className="flex flex-col gap-4">
        {blocks.map((block, blockIdx) => (
          <article
            key={block.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <header className="flex items-baseline gap-3">
              <span className="text-xs font-medium tracking-wider text-zinc-400 dark:text-zinc-500">
                {String(blockIdx + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {block.name}
              </h2>
            </header>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={e => handleDragEnd(e, block.id)}
            >
              <SortableContext
                items={block.todos.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-1.5">
                  {block.todos.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDelete={handleDeleteRequest}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>

            {/* 투두 추가 영역 */}
            {addingBlockId === block.id ? (
              <div className="flex items-center gap-2 pl-5">
                <input
                  autoFocus
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleAddTodo(block.id);
                    if (e.key === 'Escape') {
                      setAddingBlockId(null);
                      setNewContent('');
                    }
                  }}
                  placeholder="새 투두 입력 후 Enter"
                  className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
                />
                <button
                  onClick={() => void handleAddTodo(block.id)}
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setAddingBlockId(null);
                    setNewContent('');
                  }}
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingBlockId(block.id);
                  setNewContent('');
                }}
                className="flex items-center gap-1.5 pl-5 text-xs text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
              >
                <span aria-hidden>+</span> 투두 추가
              </button>
            )}
          </article>
        ))}
      </section>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="투두 삭제 확인"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              투두를 삭제할까요?
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              &ldquo;{deleteTarget.content}&rdquo;
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
              삭제하면 복구할 수 없어요.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                취소
              </button>
              <button
                onClick={() => void handleDeleteConfirm()}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
