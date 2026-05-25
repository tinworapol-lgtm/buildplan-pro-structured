const { sendJson, getBearerToken, getSupabaseUser, ensureBetaTrial } = require('./_shared');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  const subscription = await ensureBetaTrial(session.user);
  return sendJson(response, 200, {
    authenticated: true,
    configured: true,
    user: session.user,
    subscription: {
      ...subscription,
      trialEndsAt: subscription?.trialEndsAt || null,
      daysLeft: subscription?.daysLeft || 0,
    },
  });
};
