const { sendJson, hasSupabaseEnv, supabaseRest, envGuardPayload } = require('../_shared');

function requireAdmin(request) {
  const expected = process.env.BETA_ADMIN_TOKEN || '';
  if (!expected) return { ok: false, status: 501, payload: { configured: false, message: 'BETA_ADMIN_TOKEN is not configured' } };
  const received = request.headers['x-admin-token'] || request.headers['X-Admin-Token'] || '';
  if (received !== expected) return { ok: false, status: 401, payload: { message: 'Unauthorized' } };
  return { ok: true };
}

async function count(path) {
  const rows = await supabaseRest(path, {
    headers: { Prefer: 'count=exact' },
  });
  return Array.isArray(rows) ? rows.length : 0;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { message: 'Method not allowed' });
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload('Supabase Admin Beta Summary', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], 'Set Supabase env vars and run supabase/schema.sql, then redeploy production.'));
  }
  const admin = requireAdmin(request);
  if (!admin.ok) return sendJson(response, admin.status, admin.payload);

  const [profiles, subscriptions, projects, feedback, audit, errors] = await Promise.all([
    count('profiles?select=id'),
    supabaseRest('subscriptions?select=id,status,package_code,trial_ends_at,created_at&order=created_at.desc&limit=50'),
    count('projects?archived_at=is.null&select=id'),
    supabaseRest('feedback?select=id,rating,message,feature_request,created_at&order=created_at.desc&limit=20'),
    supabaseRest('audit_logs?select=id,action,metadata,created_at&order=created_at.desc&limit=20'),
    supabaseRest('error_events?select=id,message,source,route,created_at&order=created_at.desc&limit=20'),
  ]);

  const activeUsers = (subscriptions || []).filter((item) => ['trialing', 'active'].includes(item.status)).length;
  return sendJson(response, 200, {
    totalUsers: profiles,
    activeUsers,
    projectsSaved: projects,
    feedback: feedback || [],
    audit: audit || [],
    errors: errors || [],
  });
};
