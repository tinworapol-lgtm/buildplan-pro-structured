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

const BETA_TRIAL_DAYS = Number(process.env.BETA_TRIAL_DAYS || 90);

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeSubscription(row) {
  if (!row) return null;
  const now = Date.now();
  const trialEnds = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : 0;
  const periodEnds = row.current_period_end ? new Date(row.current_period_end).getTime() : 0;
  let status = row.status || 'inactive';
  if (status === 'trialing' && trialEnds && trialEnds < now) status = 'expired';
  if (status === 'active' && periodEnds && periodEnds < now) status = 'expired';
  const expiresAt = row.trial_ends_at || row.current_period_end || null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86400000)) : 0;
  return {
    id: row.id,
    status,
    plan: row.package_code || row.plan || null,
    packageCode: row.package_code || row.plan || null,
    billingCycle: row.billing_cycle || null,
    trialStartedAt: row.trial_started_at || null,
    trialEndsAt: row.trial_ends_at || null,
    expiresAt,
    daysLeft,
  };
}

async function getLatestSubscription(userId) {
  const rows = await supabaseRest('subscriptions?user_id=eq.' + encodeURIComponent(userId) + '&select=id,status,plan,package_code,billing_cycle,trial_started_at,trial_ends_at,current_period_end,stripe_customer_id&order=created_at.desc&limit=1');
  return normalizeSubscription(Array.isArray(rows) ? rows[0] : null);
}

async function ensureBetaTrial(user) {
  const now = new Date();
  await supabaseRest('profiles?on_conflict=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email || '',
      display_name: user.name || '',
      updated_at: now.toISOString(),
    }),
  });

  const existing = await getLatestSubscription(user.id);
  if (existing) return existing;

  const trialStartedAt = now.toISOString();
  const trialEndsAt = addDays(now, BETA_TRIAL_DAYS).toISOString();
  const rows = await supabaseRest('subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: user.id,
      status: 'trialing',
      plan: '599',
      package_code: '599',
      billing_cycle: 'trial',
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      updated_at: trialStartedAt,
    }),
  });
  return normalizeSubscription(Array.isArray(rows) ? rows[0] : rows);
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
  BETA_TRIAL_DAYS,
  hasSupabaseEnv,
  getMissingEnv,
  envGuardPayload,
  getSupabaseUser,
  ensureBetaTrial,
  getLatestSubscription,
  normalizeSubscription,
  supabaseRest,
};
