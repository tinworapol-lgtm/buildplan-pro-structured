const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, hasSupabaseEnv, supabaseRest, envGuardPayload, writeAuditLog } = require('../_shared');

const BETA_PROJECT_LIMIT = Number(process.env.BETA_PROJECT_LIMIT || 10);
const BETA_PROJECT_PAYLOAD_BYTES = Number(process.env.BETA_PROJECT_PAYLOAD_BYTES || 750000);

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
      const rows = await supabaseRest('projects?id=eq.' + encodeURIComponent(projectId) + '&user_id=eq.' + encodeURIComponent(session.user.id) + '&archived_at=is.null&select=id,name,payload,updated_at,created_at&limit=1');
      const project = Array.isArray(rows) ? rows[0] : null;
      if (!project) return sendJson(response, 404, { message: 'Project not found' });
      await writeAuditLog(session.user.id, 'project.load', { projectId });
      return sendJson(response, 200, { project: { id: project.id, name: project.name, payload: project.payload, updatedAt: project.updated_at, createdAt: project.created_at } });
    }
    const rows = await supabaseRest('projects?user_id=eq.' + encodeURIComponent(session.user.id) + '&archived_at=is.null&select=id,name,updated_at,created_at&order=updated_at.desc');
    await writeAuditLog(session.user.id, 'project.list', { count: (rows || []).length });
    return sendJson(response, 200, { projects: (rows || []).map(summarize) });
  }

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    const payload = body.projectData || body.payload;
    if (!payload || typeof payload !== 'object') return sendJson(response, 400, { message: 'Missing projectData payload' });
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (payloadBytes > BETA_PROJECT_PAYLOAD_BYTES) {
      return sendJson(response, 413, { message: 'Project payload is too large for beta cloud save', limitBytes: BETA_PROJECT_PAYLOAD_BYTES });
    }
    if (!body.id) {
      const existingRows = await supabaseRest('projects?user_id=eq.' + encodeURIComponent(session.user.id) + '&archived_at=is.null&select=id');
      if ((existingRows || []).length >= BETA_PROJECT_LIMIT) {
        return sendJson(response, 403, { message: 'Beta project limit reached', limit: BETA_PROJECT_LIMIT });
      }
    }
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
    await writeAuditLog(session.user.id, 'project.save', { projectId: project?.id, name, payloadBytes });
    return sendJson(response, 200, { project: summarize(project) });
  }

  if (request.method === 'DELETE') {
    if (!projectId) return sendJson(response, 400, { message: 'Project id is required' });
    const rows = await supabaseRest('projects?id=eq.' + encodeURIComponent(projectId) + '&user_id=eq.' + encodeURIComponent(session.user.id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    const project = Array.isArray(rows) ? rows[0] : null;
    if (!project) return sendJson(response, 404, { message: 'Project not found' });
    await writeAuditLog(session.user.id, 'project.archive', { projectId });
    return sendJson(response, 200, { archived: true, project: summarize(project) });
  }

  return sendJson(response, 405, { message: 'Method not allowed' });
};
