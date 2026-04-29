// 프로젝트 수정(PATCH) / 소프트 딜리트(DELETE)
// PATCH  /api/projects/[id]  Body: { title?: string; status?: 'active' | 'completed' }
// DELETE /api/projects/[id]

import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['active', 'completed'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { title?: string; status?: string };
  try {
    body = (await request.json()) as { title?: string; status?: string };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return Response.json({ error: 'title_required' }, { status: 400 });
    }
    updates.title = body.title.trim();
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ValidStatus)) {
      return Response.json({ error: 'invalid_status' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 1) {
    return Response.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id, title, status')
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Not found' }, { status: error ? 500 : 404 });
  }
  return Response.json({ project: data });
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

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ success: true });
}
