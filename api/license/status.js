const { sendJson, getBearerToken, getSupabaseUser, hasSupabaseEnv, ensureBetaTrial } = require('../_shared');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, { status: 'unavailable', configured: false, message: 'Supabase is not configured' });
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const subscription = await ensureBetaTrial(session.user);
  if (!subscription) {
    return sendJson(response, 200, { status: 'inactive', plan: null, expiresAt: null, message: 'No active subscription found' });
  }

  return sendJson(response, 200, {
    status: subscription.status || 'trialing',
    plan: subscription.packageCode || subscription.plan || null,
    packageCode: subscription.packageCode || subscription.plan || null,
    billingCycle: subscription.billingCycle || null,
    trialStartedAt: subscription.trialStartedAt || null,
    trialEndsAt: subscription.trialEndsAt || null,
    daysLeft: subscription.daysLeft || 0,
    expiresAt: subscription.expiresAt || null,
    message: '',
  });
};
