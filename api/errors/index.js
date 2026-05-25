const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, hasSupabaseEnv, supabaseRest, envGuardPayload, writeAuditLog } = require('../_shared');

function cleanText(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { message: 'Method not allowed' });
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload('Supabase Error Events', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], 'Set Supabase env vars and run supabase/schema.sql, then redeploy production.'));
  }

  const token = getBearerToken(request);
  const session = token ? await getSupabaseUser(token) : { ok: false };
  const body = await readJsonBody(request);
  const message = cleanText(body.message || body.reason, 1000);
  if (!message) return sendJson(response, 400, { message: 'Error message is required' });

  const userId = session.ok ? session.user.id : null;
  const rows = await supabaseRest('error_events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      message,
      source: cleanText(body.source, 240) || null,
      stack: cleanText(body.stack, 4000) || null,
      route: cleanText(body.route, 500) || null,
      user_agent: cleanText(body.user_agent || body.userAgent || request.headers['user-agent'], 500) || null,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    }),
  });
  const errorEvent = Array.isArray(rows) ? rows[0] : rows;
  if (userId) await writeAuditLog(userId, 'error.report', { errorEventId: errorEvent?.id, source: body.source || '' });
  return sendJson(response, 200, { errorEvent: { id: errorEvent.id, createdAt: errorEvent.created_at } });
};
