const { sendJson, getBearerToken, getSupabaseUser } = require('./_shared');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }

  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  return sendJson(response, 200, {
    authenticated: true,
    configured: true,
    user: session.user,
  });
};
