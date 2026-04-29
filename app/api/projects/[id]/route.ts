// 프로젝트 수정(PATCH) / 소프트 딜리트(DELETE)
// PATCH  /api/projects/[id]  Body: { title: string }
// DELETE /api/projects/[id]

import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { title?: string };
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return Response.json({ error: 'title_required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ title: body.title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('id, title')
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
