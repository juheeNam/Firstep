'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  generateProjectSummary,
  createProject,
} from '@/app/projects/new/level-2/actions';

type DraftState = {
  step: number;
  q1Text: string;
  q2: string | null;
  q3: string | null;
  q4: string[];
  q5: string | null;
};

const SESSION_KEY = 'firstep_level2_draft';

function readDraft(): DraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved) as DraftState;
    return draft.step < 5 ? draft : null;
  } catch {
    return null;
  }
}

const Q2_OPTIONS = ['웹앱', '모바일 앱', '브라우저 확장', '데스크톱·CLI', '랜딩 페이지'];
const Q3_OPTIONS = ['필요 없음', '로그인만', '유저별 데이터', '역할·권한 분리', '결제까지'];
const Q4_OPTIONS = ['결제', '이메일·알림', 'AI(LLM)', '외부 API 연동', '없음', '잘 모르겠어요'];
const Q4_EXCLUSIVE = new Set(['없음', '잘 모르겠어요']);
const Q5_OPTIONS = ['나만 사용', '지인 공유', '공개 베타', '정식 출시', '수익화 목표'];

const STEP_QUESTIONS = [
  '만들고 싶은 서비스를 한 줄로 설명해주세요',
  '어떤 형태의 프로젝트인가요?',
  '사용자 인증/개인화는 어디까지 필요해요?',
  '어떤 외부 통합이 필요해요? (해당되는 것 모두 선택)',
  '누구한테 보여줄 계획인가요?',
];

export function Level2Flow({ errorCode }: { errorCode?: string }) {
  // 세션 스토리지 복원 — lazy initializer로 최초 렌더에서 읽어 cascading setState 방지
  const [step, setStep] = useState<number>(() => readDraft()?.step ?? 0);
  const [q1Text, setQ1Text] = useState<string>(() => readDraft()?.q1Text ?? '');
  const [q2, setQ2] = useState<string | null>(() => readDraft()?.q2 ?? null);
  const [q3, setQ3] = useState<string | null>(() => readDraft()?.q3 ?? null);
  const [q4, setQ4] = useState<string[]>(() => readDraft()?.q4 ?? []);
  const [q5, setQ5] = useState<string | null>(() => readDraft()?.q5 ?? null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 답변 변경 시 세션 스토리지에 저장
  useEffect(() => {
    if (step >= 5) return;
    const draft: DraftState = { step, q1Text, q2, q3, q4, q5 };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
  }, [step, q1Text, q2, q3, q4, q5]);

  function toggleQ4(option: string) {
    if (Q4_EXCLUSIVE.has(option)) {
      setQ4(prev => (prev.includes(option) ? [] : [option]));
    } else {
      setQ4(prev => {
        const withoutExclusive = prev.filter(o => !Q4_EXCLUSIVE.has(o));
        return withoutExclusive.includes(option)
          ? withoutExclusive.filter(o => o !== option)
          : [...withoutExclusive, option];
      });
    }
  }

  function canProceed(): boolean {
    if (step === 0) return q1Text.trim().length > 0;
    if (step === 1) return q2 !== null;
    if (step === 2) return q3 !== null;
    if (step === 3) return q4.length > 0;
    if (step === 4) return q5 !== null;
    if (step === 5) return editTitle.trim().length > 0;
    return false;
  }

  function handleNext() {
    if (step < 4) {
      setStep(s => s + 1);
      return;
    }
    // step 4 완료 → Claude 요약 생성
    setSummaryError(null);
    startTransition(async () => {
      const result = await generateProjectSummary({
        q1Text,
        q2Form: q2!,
        q3Auth: q3!,
        q4Integrations: q4,
        q5Audience: q5!,
      });
      if ('error' in result) {
        setSummaryError(result.error);
        return;
      }
      setEditTitle(result.title);
      setEditSummary(result.ideaSummary);
      setStep(5);
    });
  }

  function handleRegenerate() {
    setSummaryError(null);
    startTransition(async () => {
      const result = await generateProjectSummary({
        q1Text,
        q2Form: q2!,
        q3Auth: q3!,
        q4Integrations: q4,
        q5Audience: q5!,
      });
      if ('error' in result) {
        setSummaryError(result.error);
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
        entryLevel: 2,
        intentData: {
          q1Text,
          q2Form: q2!,
          q3Auth: q3!,
          q4Integrations: q4,
          q5Audience: q5!,
        },
      });
    });
  }

  // ── 요약 화면 (step 5) ──────────────────────────────────────
  if (step === 5) {
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

        {summaryError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {summaryError}
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
            onClick={() => setStep(4)}
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

  // ── 질문 화면 (step 0~4) ────────────────────────────────────
  const totalSteps = 5;
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

      {/* 에러 배너 (저장 실패) */}
      {errorCode === 'save_failed' && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          저장에 실패했어요. 다시 시도해 주세요.
        </div>
      )}

      {/* 질문 */}
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {STEP_QUESTIONS[step]}
      </h2>

      {/* 입력 영역 */}
      {step === 0 && (
        <textarea
          value={q1Text}
          onChange={e => setQ1Text(e.target.value)}
          rows={4}
          placeholder="예: 헬스장 운동 기록을 친구들과 공유하는 앱"
          autoFocus
          className="resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
        />
      )}

      {step === 1 && (
        <OptionGrid
          options={Q2_OPTIONS}
          selected={q2 ? [q2] : []}
          onToggle={opt => setQ2(opt)}
        />
      )}

      {step === 2 && (
        <OptionGrid
          options={Q3_OPTIONS}
          selected={q3 ? [q3] : []}
          onToggle={opt => setQ3(opt)}
        />
      )}

      {step === 3 && (
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            해당되는 것 모두 선택하세요
          </p>
          <OptionGrid
            options={Q4_OPTIONS}
            selected={q4}
            onToggle={toggleQ4}
            multi
          />
        </>
      )}

      {step === 4 && (
        <OptionGrid
          options={Q5_OPTIONS}
          selected={q5 ? [q5] : []}
          onToggle={opt => setQ5(opt)}
        />
      )}

      {/* 요약 생성 에러 */}
      {summaryError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {summaryError}
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
          {isPending ? '요약 생성 중...' : step === 4 ? '요약 만들기' : '다음'}
        </button>
      </div>
    </div>
  );
}

// 선택지 그리드 (단일·복수 공용)
type OptionGridProps = {
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
  multi?: boolean;
};

function OptionGrid({ options, selected, onToggle, multi = false }: OptionGridProps) {
  return (
    <div className={`grid gap-2 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            aria-pressed={isSelected}
            className={
              'rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50 ' +
              (isSelected
                ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600')
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
