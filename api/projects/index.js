const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, hasSupabaseEnv, supabaseRest, envGuardPayload } = require('../_shared');

function summarize(project) {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updated_at,
    createdAt: project.created_at,
  };
}

module.exports = async function handler(request, response) {
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload('Supabase Cloud Save', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], 'Set Supabase env vars and run supabase/schema.sql, then redeploy production.'));
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const url = new URL(request.url, 'http://localhost');
  const projectId = url.searchParams.get('id');

  if (request.method === 'GET') {
    if (projectId) {
      const rows = await supabaseRest('projects?id=eq.' + encodeURIComponent(projectId) + '&user_id=eq.' + encodeURIComponent(session.user.id) + '&select=id,name,payload,updated_at,created_at&limit=1');
      const project = Array.isArray(rows) ? rows[0] : null;
      if (!project) return sendJson(response, 404, { message: 'Project not found' });
      return sendJson(response, 200, { project: { id: project.id, name: project.name, payload: project.payload, updatedAt: project.updated_at, createdAt: project.created_at } });
    }
    const rows = await supabaseRest('projects?user_id=eq.' + encodeURIComponent(session.user.id) + '&select=id,name,updated_at,created_at&order=updated_at.desc');
    return sendJson(response, 200, { projects: (rows || []).map(summarize) });
  }

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    const payload = body.projectData || body.payload;
    if (!payload || typeof payload !== 'object') return sendJson(response, 400, { message: 'Missing projectData payload' });
    const name = String(body.name || payload.projectInfo?.name || 'Untitled project').slice(0, 160);
    const row = {
      id: body.id || undefined,
      user_id: session.user.id,
      name,
      payload,
      updated_at: new Date().toISOString(),
    };
    const rows = await supabaseRest('projects?on_conflict=id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    });
    const project = Array.isArray(rows) ? rows[0] : rows;
    return sendJson(response, 200, { project: summarize(project) });
  }

  return sendJson(response, 405, { message: 'Method not allowed' });
};
