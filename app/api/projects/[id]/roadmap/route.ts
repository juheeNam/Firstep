// 로드맵 생성 Route Handler
// POST /api/projects/[id]/roadmap
// Body: { size: 'auto' | 'basic' | 'detailed' }
// Response: text/event-stream — SSE 이벤트(chunk / retry / done / error)

import { createClient } from '@/lib/supabase/server';
import { createAnthropicClient, MODELS } from '@/lib/claude/index';
import {
  buildRoadmapSystemPrompt,
  buildRoadmapUserPrompt,
  parseRoadmapDraft,
} from '@/lib/claude/roadmap';
import type { SizeOption, IntentDataLevel2, IntentDataLevel3 } from '@/lib/types/projects';
import type { StackEntry } from '@/lib/types/stacks';
import type { RoadmapDraft } from '@/lib/types/roadmap';

// Anthropic SDK + Supabase SSR 모두 Node 런타임에서 안정적으로 동작
export const runtime = 'nodejs';
// 스트리밍 도중 길어질 수 있음 — Vercel Hobby 한도 60s 안쪽 목표
export const maxDuration = 60;

const VALID_SIZES: readonly SizeOption[] = ['auto', 'basic', 'detailed'];

// Postgres unique violation 에러 코드
const PG_UNIQUE_VIOLATION = '23505';

type SseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'retry' }
  | { type: 'done'; projectId: string }
  | { type: 'error'; message: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;

  // 1) 인증
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2) body 파싱·검증
  let size: SizeOption;
  try {
    const body = (await request.json()) as { size?: unknown };
    if (typeof body.size !== 'string' || !VALID_SIZES.includes(body.size as SizeOption)) {
      return new Response(JSON.stringify({ error: 'invalid_size' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    size = body.size as SizeOption;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3) 프로젝트 소유 검증 (RLS와 별개로 1차 서버 가드)
  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, title, idea_summary, entry_level, intent_data')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4) 이미 로드맵이 있으면 중복 생성 차단 (soft guard — DB UNIQUE 제약이 hard guard)
  const { count: existingBlocks } = await supabase
    .from('blocks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (existingBlocks && existingBlocks > 0) {
    return new Response(JSON.stringify({ error: 'already_exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5) 유저 스택 조회 (프롬프트 우선순위에 활용)
  const { data: stackRows } = await supabase
    .from('user_stacks')
    .select('category, tech_name, status')
    .eq('user_id', user.id);

  const stacks: StackEntry[] = (stackRows ?? [])
    .filter(r => r.status === 'used' || r.status === 'want')
    .map(r => ({
      category: r.category,
      techName: r.tech_name,
      status: r.status,
    }));

  // 6) 프롬프트 빌드 (size_option 업데이트는 이슈 2: 성공 직전으로 이동)
  const systemPrompt = buildRoadmapSystemPrompt(size);
  const userPrompt = buildRoadmapUserPrompt({
    title:       project.title,
    ideaSummary: project.idea_summary,
    entryLevel:  project.entry_level as 1 | 2 | 3,
    intentData:  project.intent_data as IntentDataLevel2 | IntentDataLevel3 | null,
    stacks,
  });

  // 7) SSE 스트림
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const abortSignal = request.signal;
      const onAbort = () => {
        // 부분 결과 저장 안 함 — blocks INSERT 전이면 그냥 종료
        try { controller.close(); } catch { /* already closed */ }
      };
      abortSignal.addEventListener('abort', onAbort);

      try {
        const client = createAnthropicClient();

        // Zod 검증 실패 시 1회 자동 재시도 (PRD §4.4.2)
        // 이슈 4: 재시도 시 max_tokens 상향해 JSON 잘림 방지
        let draft: RoadmapDraft | null = null;
        for (let attempt = 0; attempt < 2 && !draft; attempt++) {
          if (abortSignal.aborted) return;

          if (attempt === 1) send({ type: 'retry' });

          const claudeStream = client.messages.stream(
            {
              model:      MODELS.sonnet,
              max_tokens: attempt === 0 ? 8192 : 16000,
              system:     systemPrompt,
              messages:   [{ role: 'user', content: userPrompt }],
            },
            { signal: abortSignal },
          );

          let raw = '';
          for await (const event of claudeStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              raw += event.delta.text;
              send({ type: 'chunk', text: event.delta.text });
            }
          }

          if (abortSignal.aborted) return;
          draft = parseRoadmapDraft(raw);
        }

        if (!draft) {
          send({
            type:    'error',
            message: '로드맵 형식을 인식하지 못했어요. 잠시 후 다시 시도해주세요.',
          });
          controller.close();
          return;
        }

        // 8) DB 저장 — blocks 먼저, todos 뒤. 실패 시 이 요청에서 생성한 blocks만 롤백.
        const blocksPayload = draft.blocks.map((b, i) => ({
          project_id: projectId,
          name:       b.name,
          seq:        i,
        }));

        const { data: insertedBlocks, error: blocksError } = await supabase
          .from('blocks')
          .insert(blocksPayload)
          .select('id, seq');

        if (blocksError) {
          // 이슈 1: UNIQUE violation — 다른 요청이 이미 생성 완료. 해당 로드맵으로 이동.
          if (blocksError.code === PG_UNIQUE_VIOLATION) {
            send({ type: 'done', projectId });
            controller.close();
            return;
          }
          console.error('[roadmap] blocks insert 실패', blocksError);
          send({ type: 'error', message: '저장 중 오류가 발생했어요. 다시 시도해주세요.' });
          controller.close();
          return;
        }

        if (!insertedBlocks) {
          send({ type: 'error', message: '저장 중 오류가 발생했어요. 다시 시도해주세요.' });
          controller.close();
          return;
        }

        // 이슈 4: RETURNING 순서는 INSERT 입력 순이지만 seq 정렬을 명시적으로 보장
        insertedBlocks.sort((a, b) => a.seq - b.seq);

        const todosPayload = insertedBlocks.flatMap(block => {
          const draftBlock = draft!.blocks[block.seq];
          if (!draftBlock) return [];
          return draftBlock.todos.map((t, i) => ({
            block_id: block.id,
            content:  t.content,
            seq:      i,
            is_done:  false,
          }));
        });

        if (todosPayload.length > 0) {
          const { error: todosError } = await supabase.from('todos').insert(todosPayload);
          if (todosError) {
            console.error('[roadmap] todos insert 실패', todosError);
            // 이슈 3: 이번 요청에서 생성한 blocks id만 롤백 (project 전체 blocks 삭제 금지)
            await supabase
              .from('blocks')
              .delete()
              .in('id', insertedBlocks.map(b => b.id));
            send({ type: 'error', message: '저장 중 오류가 발생했어요. 다시 시도해주세요.' });
            controller.close();
            return;
          }
        }

        // 이슈 2: size_option은 blocks/todos 저장 성공 직후에만 기록
        await supabase
          .from('projects')
          .update({ size_option: size })
          .eq('id', projectId);

        send({ type: 'done', projectId });
        controller.close();
      } catch (err) {
        // AbortError: 클라이언트 취소 — 부분 결과 저장 없이 조용히 종료
        if (err instanceof Error && (err.name === 'AbortError' || abortSignal.aborted)) {
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        console.error('[roadmap] generate failed', err);
        try {
          send({ type: 'error', message: 'AI 호출에 실패했어요. 잠시 후 다시 시도해주세요.' });
          controller.close();
        } catch { /* already closed */ }
      } finally {
        abortSignal.removeEventListener('abort', onAbort);
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type':  'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx/Vercel 프록시 버퍼링 비활성화 (PRD §5.1 첫 청크 5초 목표)
    },
  });
}
