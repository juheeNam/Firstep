// 투두 단건 수정(PATCH) / 삭제(DELETE)
// PATCH /api/todos/[id]  Body: { is_done?: boolean; content?: string }
// DELETE /api/todos/[id]

import { createClient } from '@/lib/supabase/server';

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

  const projectUserId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (todo?.blocks as any)?.projects?.user_id as string | undefined;
  if (!todo || projectUserId !== user.id) {
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

  const projectUserId =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (todo?.blocks as any)?.projects?.user_id as string | undefined;
  if (!todo || projectUserId !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}
