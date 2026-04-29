// 블록 추가(POST) + seq 재정렬(PATCH)
// POST  /api/projects/[id]/blocks  Body: { name: string }
// PATCH /api/projects/[id]/blocks  Body: { orderedIds: string[] }

import { createClient } from '@/lib/supabase/server';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
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

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (!project || project.user_id !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // 현재 최대 seq 조회
  const { data: maxRow } = await supabase
    .from('blocks')
    .select('seq')
    .eq('project_id', projectId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (maxRow?.seq ?? 0) + 1;

  const { data, error } = await supabase
    .from('blocks')
    .insert({ project_id: projectId, name: body.name.trim(), seq: nextSeq })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ block: data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { orderedIds?: string[] };
  try {
    body = (await request.json()) as { orderedIds?: string[] };
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!Array.isArray(body.orderedIds)) {
    return Response.json({ error: 'orderedIds_required' }, { status: 400 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (!project || project.user_id !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const updates = body.orderedIds.map((blockId, idx) =>
    supabase
      .from('blocks')
      .update({ seq: idx + 1, updated_at: new Date().toISOString() })
      .eq('id', blockId)
      .eq('project_id', projectId),
  );

  await Promise.all(updates);
  return Response.json({ success: true });
}
