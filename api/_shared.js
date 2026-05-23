function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : '';
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Request body too large'));
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

function getSupabaseEnv() {
  return {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serverKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

function hasSupabaseEnv() {
  const env = getSupabaseEnv();
  return !!(env.url && env.anonKey && env.serverKey);
}

function getMissingEnv(names) {
  return names.filter((name) => !String(process.env[name] || '').trim());
}

function envGuardPayload(area, names, setupAction) {
  return {
    configured: false,
    area,
    missing: getMissingEnv(names),
    message: area + ' is not configured',
    setupAction,
    setupUrl: '/api/system/readiness',
    docs: 'docs/SAAS_LAUNCH_CHECKLIST_TH.md',
  };
}

async function getSupabaseUser(accessToken) {
  const env = getSupabaseEnv();
  if (!env.url || !env.anonKey) {
    return {
      ok: false,
      status: 501,
      payload: {
        authenticated: false,
        ...envGuardPayload('Supabase Auth', ['SUPABASE_URL', 'SUPABASE_ANON_KEY'], 'Set Supabase Auth env vars in Vercel, then redeploy production.'),
      },
    };
  }
  if (!accessToken) {
    return { ok: false, status: 401, payload: { authenticated: false, message: 'Missing bearer token' } };
  }
  const response = await fetch(env.url.replace(/\/$/, '') + '/auth/v1/user', {
    headers: {
      apikey: env.anonKey,
      Authorization: 'Bearer ' + accessToken,
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    return { ok: false, status: 401, payload: { authenticated: false, message: 'Invalid Supabase session' } };
  }
  return { ok: true, user: { id: payload.id, email: payload.email || '', name: payload.user_metadata?.name || '' } };
}

async function supabaseRest(path, options = {}) {
  const env = getSupabaseEnv();
  const response = await fetch(env.url.replace(/\/$/, '') + '/rest/v1/' + path.replace(/^\//, ''), {
    ...options,
    headers: {
      apikey: env.serverKey,
      Authorization: 'Bearer ' + env.serverKey,
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.message || 'Supabase REST request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

module.exports = {
  sendJson,
  getBearerToken,
  readJsonBody,
  hasSupabaseEnv,
  getMissingEnv,
  envGuardPayload,
  getSupabaseUser,
  supabaseRest,
};
