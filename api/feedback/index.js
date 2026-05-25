const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, hasSupabaseEnv, supabaseRest, envGuardPayload, writeAuditLog } = require('../_shared');

module.exports = async function handler(request, response) {
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, envGuardPayload('Supabase Feedback', ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], 'Set Supabase env vars and run supabase/schema.sql, then redeploy production.'));
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    const rating = Number(body.rating || 0);
    const message = String(body.message || '').trim();
    const featureRequest = String(body.feature_request || body.featureRequest || '').trim();
    if (!message) return sendJson(response, 400, { message: 'Feedback message is required' });
    if (rating && (rating < 1 || rating > 5)) return sendJson(response, 400, { message: 'Rating must be between 1 and 5' });

    const rows = await supabaseRest('feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: session.user.id,
        rating: rating || null,
        message: message.slice(0, 2000),
        feature_request: featureRequest.slice(0, 1000) || null,
        project_context: body.project_context || body.projectContext || null,
      }),
    });
    const feedback = Array.isArray(rows) ? rows[0] : rows;
    await writeAuditLog(session.user.id, 'feedback.submit', { feedbackId: feedback?.id, rating: rating || null });
    return sendJson(response, 200, { feedback: { id: feedback.id, createdAt: feedback.created_at } });
  }

  if (request.method === 'GET') {
    const rows = await supabaseRest('feedback?user_id=eq.' + encodeURIComponent(session.user.id) + '&select=id,rating,message,feature_request,project_context,created_at&order=created_at.desc&limit=20');
    return sendJson(response, 200, { feedback: rows || [] });
  }

  return sendJson(response, 405, { message: 'Method not allowed' });
};
