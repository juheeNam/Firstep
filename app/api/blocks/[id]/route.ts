// 블록 이름 수정(PATCH) / 삭제(DELETE)
// PATCH /api/blocks/[id]  Body: { name: string }
// DELETE /api/blocks/[id]

import { createClient } from '@/lib/supabase/server';

// Supabase 조인 응답 타입 — N:1은 객체, getFirst로 방어
type BlockOwnerRow = {
  id: string;
  project_id: string;
  projects: { user_id: string } | { user_id: string }[] | null;
};

function getFirst<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

async function verifyOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blockId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('blocks')
    .select('id, project_id, projects(user_id)')
    .eq('id', blockId)
    .single();

  const proj = getFirst((data as BlockOwnerRow | null)?.projects);
  return !!data && proj?.user_id === userId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'name_required' }, { status: 400 });
  }

  if (!(await verifyOwner(supabase, id, user.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('blocks')
    .update({ name: body.name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ block: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await verifyOwner(supabase, id, user.id))) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase.from('blocks').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
