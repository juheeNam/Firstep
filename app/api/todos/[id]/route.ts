// 투두 단건 수정(PATCH) / 삭제(DELETE)
// PATCH /api/todos/[id]  Body: { is_done?: boolean; content?: string }
// DELETE /api/todos/[id]

import { createClient } from '@/lib/supabase/server';

// Supabase 조인 응답 타입 — 중첩 조인은 배열로 반환됨
type TodoOwnerRow = {
  id: string;
  block_id: string;
  blocks: {
    project_id: string;
    projects: { user_id: string }[];
  }[];
};

function extractUserId(row: TodoOwnerRow | null): string | undefined {
  return row?.blocks?.[0]?.projects?.[0]?.user_id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { is_done?: boolean; content?: string };
  try {
    body = (await request.json()) as { is_done?: boolean; content?: string };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  // 권한 확인: todo → block → project → user_id
  const { data: todo } = await supabase
    .from('todos')
    .select('id, block_id, blocks(project_id, projects(user_id))')
    .eq('id', id)
    .single();

  if (!todo || extractUserId(todo as TodoOwnerRow) !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_done === 'boolean') {
    updates.is_done = body.is_done;
    updates.completed_at = body.is_done ? new Date().toISOString() : null;
  }
  if (typeof body.content === 'string' && body.content.trim().length > 0) {
    updates.content = body.content.trim();
  }

  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ todo: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: todo } = await supabase
    .from('todos')
    .select('id, block_id, blocks(project_id, projects(user_id))')
    .eq('id', id)
    .single();

  if (!todo || extractUserId(todo as TodoOwnerRow) !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}
