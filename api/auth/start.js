const { sendJson, readJsonBody, envGuardPayload, normalizeMemberProfile } = require('../_shared');

function getSupabaseAuthEnv() {
  return {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }

  const env = getSupabaseAuthEnv();
  if (!env.url || !env.anonKey) {
    return sendJson(response, 501, envGuardPayload('Supabase Auth', ['SUPABASE_URL', 'SUPABASE_ANON_KEY'], 'Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, then redeploy production.'));
  }

  const body = await readJsonBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const signupMode = body.signupMode === true || body.signupMode === 'signup';
  const memberProfile = normalizeMemberProfile(body.memberProfile || {}, email);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return sendJson(response, 400, { message: 'Valid email is required' });
  }

  const supabaseResponse = await fetch(env.url.replace(/\/$/, '') + '/auth/v1/otp', {
    method: 'POST',
    headers: {
      apikey: env.anonKey,
      Authorization: 'Bearer ' + env.anonKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      create_user: true,
      data: {
        source: 'buildplan-pro',
        signupMode,
        full_name: memberProfile.full_name,
        organization: memberProfile.organization,
        role: memberProfile.role,
      },
    }),
  });
  const payload = await supabaseResponse.json().catch(() => ({}));
  if (!supabaseResponse.ok) {
    return sendJson(response, supabaseResponse.status, { message: payload.msg || payload.message || 'Unable to send login code' });
  }

  return sendJson(response, 200, {
    configured: true,
    sent: true,
    email,
    signupMode,
    memberProfile: {
      email: memberProfile.email,
      fullName: memberProfile.full_name,
      phone: memberProfile.phone,
      organization: memberProfile.organization,
      role: memberProfile.role,
    },
    message: 'Login code sent',
  });
};
