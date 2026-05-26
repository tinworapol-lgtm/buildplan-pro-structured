const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, ensureBetaTrial, getMemberProfile, upsertMemberProfile } = require('./_shared');

module.exports = async function handler(request, response) {
  if (!['GET', 'PATCH'].includes(request.method)) {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  if (request.method === 'PATCH') {
    const body = await readJsonBody(request);
    const memberProfile = await upsertMemberProfile(session.user, body.memberProfile || body);
    return sendJson(response, 200, {
      authenticated: true,
      configured: true,
      user: session.user,
      memberProfile,
    });
  }

  const subscription = await ensureBetaTrial(session.user);
  const memberProfile = await getMemberProfile(session.user.id) || await upsertMemberProfile(session.user, {
    email: session.user.email,
    fullName: session.user.name,
    betaSource: 'session-refresh',
  });
  return sendJson(response, 200, {
    authenticated: true,
    configured: true,
    user: session.user,
    memberProfile,
    subscription: {
      ...subscription,
      trialEndsAt: subscription?.trialEndsAt || null,
      daysLeft: subscription?.daysLeft || 0,
    },
  });
};
