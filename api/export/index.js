const { sendJson, getBearerToken, getSupabaseUser, hasSupabaseEnv, supabaseRest, envGuardPayload, writeAuditLog } = require('../_shared');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { message: 'Method not allowed' });
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload('Supabase User Export', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], 'Set Supabase env vars and run supabase/schema.sql, then redeploy production.'));
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const userId = encodeURIComponent(session.user.id);
  const [projects, feedback, subscriptions] = await Promise.all([
    supabaseRest('projects?user_id=eq.' + userId + '&select=id,name,payload,created_at,updated_at,archived_at&order=updated_at.desc'),
    supabaseRest('feedback?user_id=eq.' + userId + '&select=id,rating,message,feature_request,project_context,created_at&order=created_at.desc'),
    supabaseRest('subscriptions?user_id=eq.' + userId + '&select=status,plan,package_code,billing_cycle,trial_started_at,trial_ends_at,current_period_end,created_at,updated_at&order=created_at.desc'),
  ]);

  await writeAuditLog(session.user.id, 'user.export', {
    projects: (projects || []).length,
    feedback: (feedback || []).length,
    subscriptions: (subscriptions || []).length,
  });

  return sendJson(response, 200, {
    exportType: 'buildplan-user-export',
    exportedAt: new Date().toISOString(),
    user: session.user,
    projects: projects || [],
    feedback: feedback || [],
    subscriptions: subscriptions || [],
  });
};
