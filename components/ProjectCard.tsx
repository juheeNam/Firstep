'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { ProjectStatus } from '@/lib/types/projects';

export type ProjectCardData = {
  id: string;
  title: string;
  status: ProjectStatus;
  updated_at: string;
  totalTodos: number;
  doneTodos: number;
};

type Props = {
  project: ProjectCardData;
  onDelete: (id: string) => void;
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '진행 중',
  completed: '완료',
  locked: '잠김',
};

const STATUS_CLASS: Record<ProjectStatus, string> = {
  active: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  completed: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  locked: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function ProjectCard({ project, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const progressPct =
    project.totalTodos === 0
      ? 0
      : Math.round((project.doneTodos / project.totalTodos) * 100);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <>
      <article className="group relative flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
        {/* 상단 행: 제목 + 상태 배지 + ⋯ 메뉴 */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="flex-1 text-base font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
          >
            {project.title || '제목 없음'}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status]}`}
            >
              {STATUS_LABEL[project.status]}
            </span>
            {/* ⋯ 메뉴 */}
            <div ref={menuRef} className="relative">
              <button
                onClick={e => {
                  e.preventDefault();
                  setMenuOpen(v => !v);
                }}
                aria-label="프로젝트 메뉴"
                className="rounded-md p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-20 min-w-[110px] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
            <span>진행률</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 하단: 수정일 */}
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          {formatRelativeDate(project.updated_at)}
        </p>
      </article>

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="프로젝트 삭제 확인"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              프로젝트를 삭제할까요?
            </h3>
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {project.title}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
              정말 삭제하시겠어요? 복구는 현재 지원되지 않아요.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete(project.id);
                }}
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
