'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  generateFollowUpQuestions,
  generateLevel3Summary,
  createProject,
} from '@/app/projects/new/level-3/actions';
import type { FollowUpQA } from '@/lib/types/projects';

type DraftState = {
  step: number;
  ideaText: string;
  questions: string[];
  answers: string[];
  qIdx: number;
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
  const [questions, setQuestions] = useState<string[]>(() => readDraft()?.questions ?? []);
  // answers[i] = 확정된 i번 질문의 답변 (currentAnswer와 분리)
  const [answers, setAnswers] = useState<string[]>(() => readDraft()?.answers ?? []);
  const [qIdx, setQIdx] = useState<number>(() => readDraft()?.qIdx ?? 0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step >= 2) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, ideaText, questions, answers, qIdx }));
  }, [step, ideaText, questions, answers, qIdx]);

  function proceedToSummary(qas: FollowUpQA[]) {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel3Summary({ ideaText, followUpQAs: qas });
      if ('error' in result) {
        setFlowError(result.error);
        return;
      }
      setEditTitle(result.title);
      setEditSummary(result.ideaSummary);
      setStep(2);
    });
  }

  function handleStart() {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateFollowUpQuestions(ideaText);
      if ('error' in result) {
        setFlowError(result.error);
        return;
      }
      setQuestions(result.questions);
      setAnswers([]);
      setQIdx(0);
      setCurrentAnswer('');
      setStep(1);
    });
  }

  function handleAnswerNext() {
    const newAnswers = [...answers.slice(0, qIdx), currentAnswer.trim()];
    setAnswers(newAnswers);
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
      setCurrentAnswer('');
    } else {
      proceedToSummary(questions.map((q, i) => ({ question: q, answer: newAnswers[i] ?? '' })));
    }
  }

  // "이제 로드맵 만들기" — 남은 질문 건너뛰고 현재까지 답변으로 요약 생성
  function handleSkipToSummary() {
    const partial: FollowUpQA[] = questions
      .slice(0, qIdx + 1)
      .map((q, i) => ({
        question: q,
        answer: i < qIdx ? (answers[i] ?? '') : currentAnswer.trim(),
      }))
      .filter(qa => qa.answer.length > 0);
    proceedToSummary(partial);
  }

  function handleBack() {
    if (qIdx === 0) {
      setStep(0);
    } else {
      setCurrentAnswer(answers[qIdx - 1] ?? '');
      setAnswers(prev => prev.slice(0, qIdx - 1));
      setQIdx(qIdx - 1);
    }
  }

  function handleRegenerate() {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel3Summary({
        ideaText,
        followUpQAs: questions
          .slice(0, answers.length)
          .map((q, i) => ({ question: q, answer: answers[i] })),
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
          followUpQAs: questions
            .slice(0, answers.length)
            .map((q, i) => ({ question: q, answer: answers[i] })),
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
            onClick={() => {
              setCurrentAnswer(answers[qIdx] ?? '');
              setStep(1);
            }}
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
              disabled={isPending || editTitle.trim().length === 0}
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

  // ── 아이디어 입력 (step 0) ──────────────────────────────────
  if (step === 0) {
    const showHint = ideaText.trim().length > 0 && ideaText.trim().length < 100;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">1 / 2</p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-0 rounded-full bg-zinc-900 dark:bg-zinc-50" />
          </div>
        </div>

        {errorCode === 'save_failed' && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            저장에 실패했어요. 다시 시도해 주세요.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            어떤 서비스를 만들고 싶으세요?
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아이디어를 구체적으로 설명할수록 더 정확한 로드맵이 만들어져요.
          </p>
        </div>

        <textarea
          value={ideaText}
          onChange={e => setIdeaText(e.target.value)}
          rows={8}
          maxLength={2000}
          placeholder="예: 헬스장 운동 기록을 친구들과 공유하는 앱을 만들고 싶어요. 운동 종목별로 세트·무게·횟수를 기록하고, 친구들과 서로 응원 메시지를 남길 수 있게 하고 싶어요..."
          autoFocus
          className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
        />

        <div className="flex items-center justify-between gap-4">
          {showHint ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              더 자세히 알려주시면 더 정확한 로드맵을 만들 수 있어요
            </p>
          ) : (
            <span />
          )}
          <p className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
            {ideaText.length} / 2000
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

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/projects/new"
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 레벨 선택으로
          </Link>
          <button
            type="button"
            onClick={handleStart}
            disabled={!ideaText.trim() || isPending}
            aria-busy={isPending}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPending ? '질문 생성 중...' : '다음'}
          </button>
        </div>
      </div>
    );
  }

  // ── 후속 질문 (step 1) — 질문을 하나씩 대화형으로 표시 ─────────
  const qProgressPct = questions.length > 0
    ? Math.round(((qIdx + 1) / questions.length) * 100)
    : 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          질문 {qIdx + 1} / {questions.length}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
            style={{ width: `${qProgressPct}%` }}
          />
        </div>
      </div>

      {/* 이전 Q&A 대화 이력 */}
      {qIdx > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          {questions.slice(0, qIdx).map((q, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{q}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{answers[i]}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {questions[qIdx]}
      </h2>

      <textarea
        value={currentAnswer}
        onChange={e => setCurrentAnswer(e.target.value)}
        rows={4}
        placeholder="답변을 입력해주세요"
        autoFocus
        className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
      />

      {flowError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {flowError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={isPending}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 이전
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkipToSummary}
            disabled={isPending}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            이제 로드맵 만들기
          </button>
          <button
            type="button"
            onClick={handleAnswerNext}
            disabled={!currentAnswer.trim() || isPending}
            aria-busy={isPending}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPending
              ? '요약 생성 중...'
              : qIdx === questions.length - 1
                ? '요약 만들기'
                : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
