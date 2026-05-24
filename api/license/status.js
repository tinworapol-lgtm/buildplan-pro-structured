const { sendJson, getBearerToken, getSupabaseUser, hasSupabaseEnv, supabaseRest } = require('../_shared');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }
  if (!hasSupabaseEnv()) {
    return sendJson(response, 501, { status: 'unavailable', configured: false, message: 'Supabase is not configured' });
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const rows = await supabaseRest('subscriptions?user_id=eq.' + encodeURIComponent(session.user.id) + '&select=status,plan,package_code,billing_cycle,current_period_end,stripe_customer_id&order=current_period_end.desc&limit=1');
  const subscription = Array.isArray(rows) ? rows[0] : null;
  if (!subscription) {
    return sendJson(response, 200, { status: 'inactive', plan: null, expiresAt: null, message: 'No active subscription found' });
  }

  return sendJson(response, 200, {
    status: subscription.status || 'inactive',
    plan: subscription.package_code || subscription.plan || null,
    packageCode: subscription.package_code || subscription.plan || null,
    billingCycle: subscription.billing_cycle || null,
    expiresAt: subscription.current_period_end || null,
    message: '',
  });
};
