'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SizeOption } from '@/lib/types/projects';

type Phase = 'pick' | 'generating' | 'error';

const SIZE_OPTIONS: Array<{
  value:       SizeOption;
  label:       string;
  description: string;
  recommended?: boolean;
}> = [
  {
    value:       'auto',
    label:       '자동',
    description: 'AI가 아이디어를 보고 적절한 규모로 짜줘요. 잘 모르겠으면 이걸 추천해요.',
    recommended: true,
  },
  {
    value:       'basic',
    label:       '기본',
    description: '블록 4~7개, 투두 15~30개. 블로그·간단 CRUD·랜딩 페이지 같은 단일 기능 도구에 적합.',
  },
  {
    value:       'detailed',
    label:       '상세',
    description: '블록 8~15개, 투두 40~80개. 인증·결제·AI·대시보드까지 포함된 복합 서비스에 적합.',
  },
];

export function RoadmapCreator({
  projectId,
  projectTitle,
}: {
  projectId:    string;
  projectTitle: string;
}) {
  const router = useRouter();
  const [phase, setPhase]       = useState<Phase>('pick');
  const [size, setSize]         = useState<SizeOption>('auto');
  const [progress, setProgress] = useState(''); // 누적 텍스트
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retried, setRetried]   = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // 언마운트 시 진행 중인 fetch 가 있으면 중단
      controllerRef.current?.abort();
    };
  }, []);

  async function startGeneration() {
    setPhase('generating');
    setProgress('');
    setErrorMsg(null);
    setRetried(false);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch(`/api/projects/${projectId}/roadmap`, {
        method:  'POST',
        body:    JSON.stringify({ size }),
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
      });

      if (!res.ok || !res.body) {
        // 4xx/5xx — 본문이 JSON 에러일 수도 있음
        let msg = '로드맵 생성에 실패했어요. 잠시 후 다시 시도해주세요.';
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error === 'already_exists') {
            // 이미 생성된 프로젝트 — 그냥 보기로 이동
            router.push(`/projects/${projectId}`);
            return;
          }
          if (data.error === 'not_found')   msg = '프로젝트를 찾을 수 없어요.';
          if (data.error === 'invalid_size') msg = '잘못된 옵션이에요.';
        } catch {
          /* body 가 SSE 면 무시 */
        }
        setErrorMsg(msg);
        setPhase('error');
        return;
      }

      const reader   = res.body.getReader();
      const decoder  = new TextDecoder();
      let   buffered = '';
      // 이슈 6: done/error 이벤트를 받지 못한 채 스트림이 종료되는 경우 감지
      let   terminated = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });

        // SSE: 이벤트 단위는 \n\n 로 구분
        let separatorIdx = buffered.indexOf('\n\n');
        while (separatorIdx >= 0) {
          const eventBlock = buffered.slice(0, separatorIdx);
          buffered         = buffered.slice(separatorIdx + 2);
          separatorIdx     = buffered.indexOf('\n\n');

          // "data: ..." 라인만 처리
          const line = eventBlock.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          let event: { type: string; text?: string; projectId?: string; message?: string };
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === 'chunk' && typeof event.text === 'string') {
            setProgress(prev => prev + event.text!);
          } else if (event.type === 'retry') {
            setRetried(true);
            setProgress('');
          } else if (event.type === 'done') {
            terminated = true;
            router.push(`/projects/${projectId}`);
            router.refresh();
            return;
          } else if (event.type === 'error') {
            terminated = true;
            setErrorMsg(event.message ?? '알 수 없는 오류가 발생했어요.');
            setPhase('error');
            return;
          }
        }
      }

      // 이슈 6: 서버가 done/error 없이 스트림을 닫음 (함수 타임아웃·연결 끊김 등)
      if (!terminated) {
        setErrorMsg('연결이 끊어졌어요. 다시 시도해주세요.');
        setPhase('error');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 사용자 취소 — pick 으로 조용히 복귀
        return;
      }
      console.error('[RoadmapCreator] stream failed', err);
      setErrorMsg('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setPhase('error');
    }
  }

  function handleCancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase('pick');
    setProgress('');
  }

  // ── 규모 선택 화면 ─────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            로드맵 규모
          </p>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            어느 정도 규모로 짤까요?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            언제든 블록을 추가/삭제할 수 있으니 부담 없이 골라주세요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {SIZE_OPTIONS.map(opt => {
            const isSelected = size === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSize(opt.value)}
                aria-pressed={isSelected}
                className={
                  'flex flex-col gap-1.5 rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-50 ' +
                  (isSelected
                    ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600')
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {opt.recommended && (
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                        (isSelected
                          ? 'bg-zinc-50/20 text-zinc-50 dark:bg-zinc-900/20 dark:text-zinc-900'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')
                      }
                    >
                      추천
                    </span>
                  )}
                </div>
                <p
                  className={
                    'text-xs ' +
                    (isSelected
                      ? 'text-zinc-200 dark:text-zinc-700'
                      : 'text-zinc-500 dark:text-zinc-400')
                  }
                >
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← 프로젝트로
          </Link>
          <button
            type="button"
            onClick={startGeneration}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            로드맵 만들기
          </button>
        </div>
      </div>
    );
  }

  // ── 생성 중 화면 ────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
            생성 중
          </p>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            AI가 로드맵을 만드는 중이에요
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            『{projectTitle || '제목 없음'}』 에 맞춰 블록과 투두를 짜고 있어요.
          </p>
        </div>

        {retried && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            형식 검증에 실패해 한 번 더 시도하고 있어요.
          </div>
        )}

        <div
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            className="h-3 w-3 animate-pulse rounded-full bg-zinc-900 dark:bg-zinc-50"
            aria-hidden
          />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {progress.length === 0
              ? '연결 중…'
              : `생성 중… (${progress.length.toLocaleString()}자)`}
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
          오류
        </p>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          로드맵을 만들지 못했어요
        </h2>
      </div>

      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
      >
        {errorMsg ?? '알 수 없는 오류가 발생했어요.'}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 프로젝트로
        </Link>
        <button
          type="button"
          onClick={startGeneration}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
