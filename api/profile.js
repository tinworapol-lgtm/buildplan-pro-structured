const { sendJson, getBearerToken, readJsonBody, getSupabaseUser, upsertMemberProfile, getMemberProfile } = require('./_shared');

module.exports = async function handler(request, response) {
  const session = await getSupabaseUser(getBearerToken(request));
  if (!session.ok) return sendJson(response, session.status, session.payload);

  if (request.method === 'GET') {
    const memberProfile = await getMemberProfile(session.user.id);
    return sendJson(response, 200, { memberProfile });
  }

  if (request.method === 'PATCH') {
    const body = await readJsonBody(request);
    const memberProfile = await upsertMemberProfile(session.user, body.memberProfile || body);
    return sendJson(response, 200, { memberProfile });
  }

  return sendJson(response, 405, { message: 'Method not allowed' });
};
