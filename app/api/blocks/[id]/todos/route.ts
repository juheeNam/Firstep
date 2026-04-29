// 투두 추가 + seq 재정렬
// POST /api/blocks/[id]/todos  Body: { content: string }
// PATCH /api/blocks/[id]/todos  Body: { orderedIds: string[] }  — seq 재정렬

import { createClient } from '@/lib/supabase/server';

// Supabase 조인 응답 타입 — 중첩 조인은 배열로 반환됨
type BlockOwnerRow = {
  id: string;
  project_id: string;
  projects: { user_id: string }[];
};

function extractUserId(row: BlockOwnerRow | null): string | undefined {
  return row?.projects?.[0]?.user_id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: blockId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    return Response.json({ error: 'content_required' }, { status: 400 });
  }

  // 권한 확인: block → project → user_id
  const { data: block } = await supabase
    .from('blocks')
    .select('id, project_id, projects(user_id)')
    .eq('id', blockId)
    .single();

  if (!block || extractUserId(block as BlockOwnerRow) !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // 현재 블록의 최대 seq 조회 (빈 블록이면 maybeSingle()로 null 처리)
  const { data: maxRow } = await supabase
    .from('todos')
    .select('seq')
    .eq('block_id', blockId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (maxRow?.seq ?? 0) + 1;

  const { data, error } = await supabase
    .from('todos')
    .insert({
      block_id: blockId,
      content: body.content.trim(),
      is_done: false,
      seq: nextSeq,
      completed_at: null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ todo: data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: blockId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { orderedIds?: string[] };
  try {
    body = (await request.json()) as { orderedIds?: string[] };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!Array.isArray(body.orderedIds)) {
    return Response.json({ error: 'orderedIds_required' }, { status: 400 });
  }

  const { data: block } = await supabase
    .from('blocks')
    .select('id, project_id, projects(user_id)')
    .eq('id', blockId)
    .single();

  if (!block || extractUserId(block as BlockOwnerRow) !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // 각 투두의 seq를 orderedIds 인덱스 기준으로 업데이트
  const updates = body.orderedIds.map((todoId, idx) =>
    supabase
      .from('todos')
      .update({ seq: idx + 1, updated_at: new Date().toISOString() })
      .eq('id', todoId)
      .eq('block_id', blockId),
  );

  await Promise.all(updates);

  return Response.json({ success: true });
}
