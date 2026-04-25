'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  generateFollowUpQuestions,
  generateLevel3Summary,
  createProject,
} from '@/app/projects/new/level-3/actions';

type DraftState = {
  step: number;
  ideaText: string;
  followUpQuestions: string[];
  answers: string[];
};

const SESSION_KEY = 'firstep_level3_draft';

function readDraft(): DraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved) as DraftState;
    return draft.step < 2 ? draft : null;
  } catch {
    return null;
  }
}

export function Level3Flow({ errorCode }: { errorCode?: string }) {
  const [step, setStep] = useState<number>(() => readDraft()?.step ?? 0);
  const [ideaText, setIdeaText] = useState<string>(() => readDraft()?.ideaText ?? '');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>(
    () => readDraft()?.followUpQuestions ?? [],
  );
  const [answers, setAnswers] = useState<string[]>(() => readDraft()?.answers ?? []);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step >= 2) return;
    const draft: DraftState = { step, ideaText, followUpQuestions, answers };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
  }, [step, ideaText, followUpQuestions, answers]);

  function updateAnswer(index: number, value: string) {
    setAnswers(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function canProceed(): boolean {
    if (step === 0) return ideaText.trim().length > 0;
    if (step === 1)
      return followUpQuestions.length > 0 && answers.every(a => a.trim().length > 0);
    if (step === 2) return editTitle.trim().length > 0;
    return false;
  }

  function handleNext() {
    if (step === 0) {
      setFlowError(null);
      startTransition(async () => {
        const result = await generateFollowUpQuestions(ideaText);
        if ('error' in result) {
          setFlowError(result.error);
          return;
        }
        setFollowUpQuestions(result.questions);
        setAnswers(new Array(result.questions.length).fill(''));
        setStep(1);
      });
      return;
    }

    if (step === 1) {
      setFlowError(null);
      startTransition(async () => {
        const result = await generateLevel3Summary({
          ideaText,
          followUpQAs: followUpQuestions.map((q, i) => ({
            question: q,
            answer: answers[i] ?? '',
          })),
        });
        if ('error' in result) {
          setFlowError(result.error);
          return;
        }
        setEditTitle(result.title);
        setEditSummary(result.ideaSummary);
        setStep(2);
      });
    }
  }

  function handleRegenerate() {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel3Summary({
        ideaText,
        followUpQAs: followUpQuestions.map((q, i) => ({
          question: q,
          answer: answers[i] ?? '',
        })),
      });
      if ('error' in result) {
        setFlowError(result.error);
        return;
      }
      setEditTitle(result.title);
      setEditSummary(result.ideaSummary);
    });
  }

  function handleCreate() {
    sessionStorage.removeItem(SESSION_KEY);
    startTransition(async () => {
      await createProject({
        title: editTitle,
        ideaSummary: editSummary,
        intentData: {
          ideaText,
          followUpQAs: followUpQuestions.map((q, i) => ({
            question: q,
            answer: answers[i] ?? '',
          })),
        },
      });
    });
  }

  // ── 요약 화면 (step 2) ──────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            기획 요약
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            AI가 정리한 기획입니다. 자유롭게 수정하세요.
          </p>
        </div>

        {flowError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {flowError}
          </div>
        )}

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              프로젝트 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              maxLength={50}
              placeholder="프로젝트 제목을 입력하세요"
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              기획 요약
            </label>
            <textarea
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              rows={5}
              placeholder="기획 요약을 입력하세요"
              className="resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={isPending}
            className="text-sm text-zinc-500 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 답변 수정하기
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {isPending ? '생성 중...' : '다시 생성'}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !canProceed()}
              aria-busy={isPending}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isPending ? '저장 중...' : '이 내용으로 로드맵 만들기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 질문 화면 (step 0~1) ────────────────────────────────────
  const totalSteps = 2;
  const progressPct = Math.round((step / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* 진행률 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {step + 1} / {totalSteps}
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 에러 배너 */}
      {errorCode === 'save_failed' && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          저장에 실패했어요. 다시 시도해 주세요.
        </div>
      )}

      {/* 입력 영역 */}
      {step === 0 && (
        <>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            어떤 서비스를 만들고 싶으세요?
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아이디어를 구체적으로 설명할수록 더 정확한 로드맵이 만들어져요.
          </p>
          <textarea
            value={ideaText}
            onChange={e => setIdeaText(e.target.value)}
            rows={8}
            maxLength={2000}
            placeholder="예: 헬스장 운동 기록을 친구들과 공유하는 앱을 만들고 싶어요. 운동 종목별로 세트·무게·횟수를 기록하고, 친구들과 서로 응원 메시지를 남길 수 있게 하고 싶어요. React Native로 모바일 앱을 만들 예정이고..."
            autoFocus
            className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
          />
          <p className="text-right text-xs text-zinc-400 dark:text-zinc-600">
            {ideaText.length} / 2000
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            몇 가지 더 알려주세요
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AI가 기획서를 검토하고 추가 정보를 요청했어요.
          </p>
          <div className="flex flex-col gap-5">
            {followUpQuestions.map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {i + 1}. {q}
                </label>
                <textarea
                  value={answers[i] ?? ''}
                  onChange={e => updateAnswer(i, e.target.value)}
                  rows={3}
                  placeholder="답변을 입력해주세요"
                  className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* 요약 생성 에러 */}
      {flowError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {flowError}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {step === 0 ? (
          <Link
            href="/projects/new"
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 레벨 선택으로
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 이전
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed() || isPending}
          aria-busy={isPending}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? step === 0
              ? '질문 생성 중...'
              : '요약 생성 중...'
            : step === 1
              ? '요약 만들기'
              : '다음'}
        </button>
      </div>
    </div>
  );
}
