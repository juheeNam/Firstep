'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  generateLevel1FollowUpQuestions,
  generateLevel1Summary,
  createLevel1Project,
} from '@/app/projects/new/level-1/actions';
import type { FollowUpQA } from '@/lib/types/projects';

const FIXED_QUESTIONS = [
  '요즘 일상에서 제일 귀찮거나 불편한 게 뭐예요?',
  '주변에서 자주 듣는 불평이 뭐예요?',
  '반복적으로 하는 일 중에 자동화하고 싶은 게 있나요?',
] as const;

type Phase = 'fixed' | 'dynamic' | 'summary';

type DraftState = {
  phase: Phase;
  fixedStep: number;
  q1: string;
  q2: string;
  q3: string;
  questions: string[];
  answers: string[];
  qIdx: number;
};

const SESSION_KEY = 'firstep_level1_draft';

function readDraft(): DraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved) as DraftState;
    return draft.phase !== 'summary' ? draft : null;
  } catch {
    return null;
  }
}

export function Level1Flow({ errorCode }: { errorCode?: string }) {
  const draft = readDraft();

  const [phase, setPhase] = useState<Phase>(() => draft?.phase ?? 'fixed');
  const [fixedStep, setFixedStep] = useState<number>(() => draft?.fixedStep ?? 0);
  const [q1, setQ1] = useState<string>(() => draft?.q1 ?? '');
  const [q2, setQ2] = useState<string>(() => draft?.q2 ?? '');
  const [q3, setQ3] = useState<string>(() => draft?.q3 ?? '');
  const [questions, setQuestions] = useState<string[]>(() => draft?.questions ?? []);
  const [answers, setAnswers] = useState<string[]>(() => draft?.answers ?? []);
  const [qIdx, setQIdx] = useState<number>(() => draft?.qIdx ?? 0);
  const [currentInput, setCurrentInput] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (phase === 'summary') return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ phase, fixedStep, q1, q2, q3, questions, answers, qIdx }));
  }, [phase, fixedStep, q1, q2, q3, questions, answers, qIdx]);

  // ── 고정 질문 진행 ────────────────────────────────────────────
  function handleFixedNext() {
    const trimmed = currentInput.trim();
    if (!trimmed) return;

    const newQ1 = fixedStep === 0 ? trimmed : q1;
    const newQ2 = fixedStep === 1 ? trimmed : q2;
    const newQ3 = fixedStep === 2 ? trimmed : q3;
    setQ1(newQ1);
    setQ2(newQ2);
    setQ3(newQ3);

    if (fixedStep < 2) {
      setFixedStep(fixedStep + 1);
      setCurrentInput('');
      return;
    }

    // 고정 3개 완료 → AI 후속 질문 생성
    setCurrentInput('');
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel1FollowUpQuestions(newQ1, newQ2, newQ3);
      if ('error' in result) {
        setFlowError(result.error);
        return;
      }
      setQuestions(result.questions);
      setAnswers([]);
      setQIdx(0);
      setPhase('dynamic');
    });
  }

  function handleFixedBack() {
    if (fixedStep === 0) return;
    const prev = fixedStep === 1 ? q1 : q2;
    setCurrentInput(prev);
    setFixedStep(fixedStep - 1);
  }

  // ── 동적 질문 진행 ────────────────────────────────────────────
  function proceedToSummary(qas: FollowUpQA[]) {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel1Summary({ q1, q2, q3, followUpQAs: qas });
      if ('error' in result) {
        setFlowError(result.error);
        return;
      }
      setEditTitle(result.title);
      setEditSummary(result.ideaSummary);
      setPhase('summary');
    });
  }

  function handleDynamicNext() {
    const newAnswers = [...answers.slice(0, qIdx), currentInput.trim()];
    setAnswers(newAnswers);
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
      setCurrentInput('');
    } else {
      proceedToSummary(questions.map((q, i) => ({ question: q, answer: newAnswers[i] ?? '' })));
    }
  }

  function handleSkipToSummary() {
    const partial: FollowUpQA[] = questions
      .slice(0, qIdx + 1)
      .map((q, i) => ({
        question: q,
        answer: i < qIdx ? (answers[i] ?? '') : currentInput.trim(),
      }))
      .filter(qa => qa.answer.length > 0);
    proceedToSummary(partial);
  }

  function handleDynamicBack() {
    if (qIdx === 0) {
      setCurrentInput(q3);
      setPhase('fixed');
      setFixedStep(2);
    } else {
      setCurrentInput(answers[qIdx - 1] ?? '');
      setAnswers(prev => prev.slice(0, qIdx - 1));
      setQIdx(qIdx - 1);
    }
  }

  // ── 요약 ─────────────────────────────────────────────────────
  function handleRegenerate() {
    setFlowError(null);
    startTransition(async () => {
      const result = await generateLevel1Summary({
        q1, q2, q3,
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
      await createLevel1Project({
        title: editTitle,
        ideaSummary: editSummary,
        intentData: {
          q1, q2, q3,
          followUpQAs: questions
            .slice(0, answers.length)
            .map((q, i) => ({ question: q, answer: answers[i] })),
        },
      });
    });
  }

  // ── 요약 화면 ─────────────────────────────────────────────────
  if (phase === 'summary') {
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
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
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
              setCurrentInput(answers[answers.length - 1] ?? '');
              setQIdx(Math.max(0, answers.length - 1));
              setPhase('dynamic');
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

  // ── 동적 질문 화면 ────────────────────────────────────────────
  if (phase === 'dynamic') {
    const qProgressPct = questions.length > 0
      ? Math.round(((qIdx + 1) / questions.length) * 100)
      : 100;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            AI 질문 {qIdx + 1} / {questions.length}
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
              style={{ width: `${qProgressPct}%` }}
            />
          </div>
        </div>

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
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          rows={4}
          placeholder="답변을 입력해주세요"
          autoFocus
          className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
        />

        {flowError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {flowError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleDynamicBack}
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
              onClick={handleDynamicNext}
              disabled={!currentInput.trim() || isPending}
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

  // ── 고정 질문 화면 (phase === 'fixed') ───────────────────────
  const fixedProgressPct = Math.round(((fixedStep + 1) / 3) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          질문 {fixedStep + 1} / 3
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
            style={{ width: `${fixedProgressPct}%` }}
          />
        </div>
      </div>

      {fixedStep > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          {([q1, q2] as const).slice(0, fixedStep).map((ans, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{FIXED_QUESTIONS[i]}</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{ans}</p>
            </div>
          ))}
        </div>
      )}

      {errorCode === 'save_failed' && fixedStep === 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          저장에 실패했어요. 다시 시도해 주세요.
        </div>
      )}

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {FIXED_QUESTIONS[fixedStep]}
      </h2>

      <textarea
        key={fixedStep}
        value={currentInput}
        onChange={e => setCurrentInput(e.target.value)}
        rows={4}
        placeholder="솔직하게 편하게 말해주세요"
        autoFocus
        className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
      />

      {flowError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {flowError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        {fixedStep === 0 ? (
          <Link
            href="/projects/new"
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 레벨 선택으로
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleFixedBack}
            disabled={isPending}
            className="text-sm text-zinc-500 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 이전
          </button>
        )}
        <button
          type="button"
          onClick={handleFixedNext}
          disabled={!currentInput.trim() || isPending}
          aria-busy={isPending}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? 'AI 질문 생성 중...'
            : fixedStep < 2
              ? '다음'
              : '다음 (AI 질문 생성)'}
        </button>
      </div>
    </div>
  );
}
