'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodoItem } from '@/components/TodoItem';
import type { BlockWithTodos, Block, Todo } from '@/lib/types/roadmap';
import type { ProjectStatus } from '@/lib/types/projects';

type Props = {
  projectId: string;
  initialTitle: string;
  initialBlocks: BlockWithTodos[];
  initialStatus: ProjectStatus;
};

type DeleteTarget =
  | { kind: 'todo'; id: string; content: string }
  | { kind: 'block'; id: string; name: string };

// ── 블록 드래그 래퍼 ──────────────────────────────────────────────────────────
function SortableBlock({
  block,
  blockIdx,
  children,
}: {
  block: Block;
  blockIdx: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="group/block relative flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      {/* 블록 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        aria-label="블록 순서 변경"
        className="absolute left-2 top-5 cursor-grab touch-none p-1 text-zinc-300 opacity-50 transition sm:opacity-0 sm:group-hover/block:opacity-100 active:cursor-grabbing dark:text-zinc-700"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.5" /><circle cx="7" cy="2.5" r="1.5" />
          <circle cx="3" cy="7" r="1.5" /><circle cx="7" cy="7" r="1.5" />
          <circle cx="3" cy="11.5" r="1.5" /><circle cx="7" cy="11.5" r="1.5" />
        </svg>
      </button>
      <span className="absolute left-8 top-5 text-xs font-medium tracking-wider text-zinc-400 dark:text-zinc-500">
        {String(blockIdx + 1).padStart(2, '0')}
      </span>
      {children}
    </article>
  );
}

export function RoadmapView({ projectId, initialTitle, initialBlocks, initialStatus }: Props) {
  const [blocks, setBlocks] = useState<BlockWithTodos[]>(initialBlocks);
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [addingTodoBlockId, setAddingTodoBlockId] = useState<string | null>(null);
  const [newTodoContent, setNewTodoContent] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockNameDraft, setBlockNameDraft] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── 프로젝트 제목 편집 ────────────────────────────────────────────────────
  async function handleTitleSubmit() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === title) { setTitleDraft(title); return; }
    setTitle(trimmed);
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
  }

  // ── 투두 토글 ─────────────────────────────────────────────────────────────
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

  // ── 투두 인라인 편집 ──────────────────────────────────────────────────────
  const handleEditTodo = useCallback(async (todoId: string, content: string) => {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setBlocks(prev =>
      prev.map(b => ({ ...b, todos: b.todos.map(t => (t.id === todoId ? { ...t, content } : t)) })),
    );
  }, []);

  // ── 투두 삭제 요청 ────────────────────────────────────────────────────────
  const handleDeleteTodoRequest = useCallback((todoId: string) => {
    for (const b of blocks) {
      const t = b.todos.find(t => t.id === todoId);
      if (t) { setDeleteTarget({ kind: 'todo', id: todoId, content: t.content }); return; }
    }
  }, [blocks]);

  // ── 블록 삭제 요청 ────────────────────────────────────────────────────────
  function handleDeleteBlockRequest(blockId: string) {
    const b = blocks.find(b => b.id === blockId);
    if (b) setDeleteTarget({ kind: 'block', id: blockId, name: b.name });
  }

  // ── 삭제 확정 ────────────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    setDeleteTarget(null);
    if (kind === 'todo') {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      setBlocks(prev => prev.map(b => ({ ...b, todos: b.todos.filter(t => t.id !== id) })));
    } else {
      await fetch(`/api/blocks/${id}`, { method: 'DELETE' });
      setBlocks(prev => prev.filter(b => b.id !== id));
    }
  }

  // ── 투두 DnD ─────────────────────────────────────────────────────────────
  function handleTodoDragEnd(event: DragEndEvent, blockId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev =>
      prev.map(b => {
        if (b.id !== blockId) return b;
        const oi = b.todos.findIndex(t => t.id === active.id);
        const ni = b.todos.findIndex(t => t.id === over.id);
        if (oi === -1 || ni === -1) return b;
        const reordered = arrayMove(b.todos, oi, ni);
        void fetch(`/api/blocks/${blockId}/todos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: reordered.map(t => t.id) }),
        });
        return { ...b, todos: reordered };
      }),
    );
  }

  // ── 블록 DnD ─────────────────────────────────────────────────────────────
  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oi = blocks.findIndex(b => b.id === active.id);
    const ni = blocks.findIndex(b => b.id === over.id);
    if (oi === -1 || ni === -1) return;
    const reordered = arrayMove(blocks, oi, ni);
    setBlocks(reordered);
    void fetch(`/api/projects/${projectId}/blocks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(b => b.id) }),
    });
  }

  // ── 투두 추가 ────────────────────────────────────────────────────────────
  async function handleAddTodo(blockId: string) {
    const content = newTodoContent.trim();
    if (!content) return;
    setNewTodoContent('');
    setAddingTodoBlockId(null);
    const res = await fetch(`/api/blocks/${blockId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const { todo } = (await res.json()) as { todo: Todo };
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, todos: [...b.todos, todo] } : b));
  }

  // ── 블록 이름 편집 ────────────────────────────────────────────────────────
  async function handleBlockNameSubmit(blockId: string) {
    const trimmed = blockNameDraft.trim();
    setEditingBlockId(null);
    if (!trimmed) return;
    const prev = blocks.find(b => b.id === blockId)?.name;
    if (trimmed === prev) return;
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, name: trimmed } : b));
    await fetch(`/api/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  // ── 블록 추가 ────────────────────────────────────────────────────────────
  async function handleAddBlock() {
    const name = newBlockName.trim();
    if (!name) return;
    setNewBlockName('');
    setAddingBlock(false);
    const res = await fetch(`/api/projects/${projectId}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const { block } = (await res.json()) as { block: Block };
    setBlocks(prev => [...prev, { ...block, todos: [] }]);
  }

  const totalTodos = blocks.reduce((a, b) => a + b.todos.length, 0);
  const doneTodos  = blocks.reduce((a, b) => a + b.todos.filter(t => t.is_done).length, 0);
  const progressPct = totalTodos === 0 ? 0 : Math.round((doneTodos / totalTodos) * 100);
  const allDone = totalTodos > 0 && doneTodos === totalTodos;

  async function handleStatusChange(next: ProjectStatus) {
    setStatus(next);
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
  }

  return (
    <>
      {/* 프로젝트 제목 인라인 편집 */}
      <div className="flex items-center gap-2">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={() => void handleTitleSubmit()}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleTitleSubmit();
              if (e.key === 'Escape') { setTitleDraft(title); setEditingTitle(false); }
            }}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-2xl font-semibold text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        ) : (
          <button
            onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
            title="클릭하면 제목 편집"
            className="group/title flex items-center gap-2 text-left text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {title}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400 opacity-0 transition group-hover/title:opacity-100 dark:text-zinc-600">
              <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25l-3 .75.75-3L11.5 2.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* 진행률 */}
      <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950" aria-label="진행률">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>진행률</span>
          <span>{doneTodos} / {totalTodos} ({progressPct}%)</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50" style={{ width: `${progressPct}%` }} />
        </div>
      </section>

      {/* 블록 목록 (DnD) */}
      <section className="flex flex-col gap-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block, blockIdx) => (
              <SortableBlock key={block.id} block={block} blockIdx={blockIdx}>
                {/* 블록 헤더 */}
                <header className="flex items-center gap-2 pl-10">
                  {editingBlockId === block.id ? (
                    <input
                      autoFocus
                      value={blockNameDraft}
                      onChange={e => setBlockNameDraft(e.target.value)}
                      onBlur={() => void handleBlockNameSubmit(block.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void handleBlockNameSubmit(block.id);
                        if (e.key === 'Escape') setEditingBlockId(null);
                      }}
                      className="flex-1 rounded border border-zinc-300 bg-white px-2 py-0.5 text-base font-semibold text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  ) : (
                    <h2
                      onDoubleClick={() => { setBlockNameDraft(block.name); setEditingBlockId(block.id); }}
                      title="더블클릭하면 편집"
                      className="flex-1 cursor-text select-none text-base font-semibold text-zinc-900 dark:text-zinc-50"
                    >
                      {block.name}
                    </h2>
                  )}
                  <div className="flex shrink-0 items-center gap-1 opacity-50 transition sm:opacity-0 sm:group-hover/block:opacity-100">
                    <button
                      onClick={() => { setBlockNameDraft(block.name); setEditingBlockId(block.id); }}
                      aria-label="블록 이름 편집"
                      className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25l-3 .75.75-3L11.5 2.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBlockRequest(block.id)}
                      aria-label="블록 삭제"
                      className="rounded p-1 text-zinc-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M4 4l.8 9.2a.5.5 0 0 0 .5.45h5.4a.5.5 0 0 0 .5-.45L12 4" />
                      </svg>
                    </button>
                  </div>
                </header>

                {/* 투두 목록 */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleTodoDragEnd(e, block.id)}>
                  <SortableContext items={block.todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-1.5">
                      {block.todos.map(todo => (
                        <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onEdit={handleEditTodo} onDelete={handleDeleteTodoRequest} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>

                {/* 투두 추가 */}
                {addingTodoBlockId === block.id ? (
                  <div className="flex items-center gap-2 pl-5">
                    <input
                      autoFocus
                      value={newTodoContent}
                      onChange={e => setNewTodoContent(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void handleAddTodo(block.id);
                        if (e.key === 'Escape') { setAddingTodoBlockId(null); setNewTodoContent(''); }
                      }}
                      placeholder="새 투두 입력 후 Enter"
                      className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <button onClick={() => void handleAddTodo(block.id)} className="rounded px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800">추가</button>
                    <button onClick={() => { setAddingTodoBlockId(null); setNewTodoContent(''); }} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingTodoBlockId(block.id); setNewTodoContent(''); }}
                    className="flex items-center gap-1.5 pl-5 text-xs text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                  >
                    <span aria-hidden>+</span> 투두 추가
                  </button>
                )}
              </SortableBlock>
            ))}
          </SortableContext>
        </DndContext>

        {/* 블록 추가 */}
        {addingBlock ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <input
              autoFocus
              value={newBlockName}
              onChange={e => setNewBlockName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleAddBlock();
                if (e.key === 'Escape') { setAddingBlock(false); setNewBlockName(''); }
              }}
              placeholder="새 블록 이름 입력 후 Enter"
              className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button onClick={() => void handleAddBlock()} className="rounded px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800">추가</button>
            <button onClick={() => { setAddingBlock(false); setNewBlockName(''); }} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">취소</button>
          </div>
        ) : (
          <button
            onClick={() => { setAddingBlock(true); setNewBlockName(''); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 py-3 text-xs text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-600 dark:hover:border-zinc-600 dark:hover:text-zinc-400"
          >
            <span aria-hidden>+</span> 블록 추가
          </button>
        )}
      </section>

      {/* 완료 CTA */}
      {allDone && status === 'active' && (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="text-3xl">🎉</div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              모든 투두를 완료했어요!
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              프로젝트를 완료 상태로 전환할 수 있어요.
            </p>
          </div>
          <button
            onClick={() => void handleStatusChange('completed')}
            className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            프로젝트 완료하기
          </button>
        </section>
      )}

      {/* 완료된 프로젝트 배너 */}
      {status === 'completed' && (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-3xl">✅</div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              완료된 프로젝트예요
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              계속 작업하고 싶다면 다시 진행 상태로 전환할 수 있어요.
            </p>
          </div>
          <button
            onClick={() => void handleStatusChange('active')}
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            다시 진행하기
          </button>
        </section>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {deleteTarget.kind === 'block' ? '블록을 삭제할까요?' : '투두를 삭제할까요?'}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              &ldquo;{deleteTarget.kind === 'block' ? deleteTarget.name : deleteTarget.content}&rdquo;
            </p>
            {deleteTarget.kind === 'block' && (
              <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">블록 안의 투두도 모두 삭제돼요.</p>
            )}
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">삭제하면 복구할 수 없어요.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">취소</button>
              <button onClick={() => void handleDeleteConfirm()} className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600">삭제</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
