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
const SUPPORT_TIERS = [
  { tier: 'Bronze', amount: 59 },
  { tier: 'Silver', amount: 99 },
  { tier: 'Gold', amount: 159 },
  { tier: 'Platinum', amount: 299 },
  { tier: 'Diamond', amount: 599 },
  { tier: 'Founder', amount: 1500 },
];

function cleanText(value, maxLength = 160) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMemberProfile(input = {}, fallbackEmail = '') {
  const email = cleanText(input.email || fallbackEmail, 254).toLowerCase();
  const fullName = cleanText(input.fullName || input.full_name || input.displayName || input.display_name, 160);
  const organization = cleanText(input.organization, 160);
  const role = cleanText(input.role, 80);
  const phone = cleanText(input.phone, 40);
  const betaSource = cleanText(input.betaSource || input.beta_source, 80);
  return {
    email,
    display_name: fullName,
    full_name: fullName,
    phone,
    organization,
    role,
    member_status: cleanText(input.memberStatus || input.member_status, 40),
    beta_source: betaSource,
    last_seen_at: new Date().toISOString(),
  };
}

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
  const profilePatch = {
    id: user.id,
    email: user.email || '',
    member_status: 'beta',
    beta_source: 'otp-login',
    last_seen_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  if (user.name) {
    profilePatch.display_name = user.name;
    profilePatch.full_name = user.name;
  }
  await supabaseRest('profiles?on_conflict=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(profilePatch),
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

async function upsertMemberProfile(user, memberProfile = {}) {
  if (!user?.id || !hasSupabaseEnv()) return null;
  const now = new Date().toISOString();
  const normalized = normalizeMemberProfile(memberProfile, user.email || '');
  const row = {
    id: user.id,
    email: normalized.email || user.email || '',
    member_status: normalized.member_status || 'beta',
    last_seen_at: now,
    updated_at: now,
  };
  for (const key of ['display_name', 'full_name', 'phone', 'organization', 'role', 'beta_source']) {
    if (normalized[key]) row[key] = normalized[key];
  }
  const rows = await supabaseRest('profiles?on_conflict=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  const profile = Array.isArray(rows) ? rows[0] : rows;
  return profile ? {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || profile.display_name || '',
    phone: profile.phone || '',
    organization: profile.organization || '',
    role: profile.role || '',
    memberStatus: profile.member_status || '',
    betaSource: profile.beta_source || '',
    lastSeenAt: profile.last_seen_at || null,
    createdAt: profile.created_at || null,
    updatedAt: profile.updated_at || null,
  } : null;
}

async function getMemberProfile(userId) {
  if (!userId || !hasSupabaseEnv()) return null;
  const rows = await supabaseRest('profiles?id=eq.' + encodeURIComponent(userId) + '&select=id,email,display_name,full_name,phone,organization,role,member_status,beta_source,last_seen_at,created_at,updated_at&limit=1');
  const profile = Array.isArray(rows) ? rows[0] : null;
  return profile ? {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name || profile.display_name || '',
    phone: profile.phone || '',
    organization: profile.organization || '',
    role: profile.role || '',
    memberStatus: profile.member_status || '',
    betaSource: profile.beta_source || '',
    lastSeenAt: profile.last_seen_at || null,
    createdAt: profile.created_at || null,
    updatedAt: profile.updated_at || null,
  } : null;
}

async function writeAuditLog(userId, action, metadata = {}) {
  if (!userId || !action || !hasSupabaseEnv()) return { logged: false };
  try {
    await supabaseRest('audit_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        action,
        metadata,
      }),
    });
    return { logged: true };
  } catch (error) {
    return { logged: false, message: error.message };
  }
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

function getSupportTierForAmount(amount) {
  const value = Number(amount) || 0;
  let selected = SUPPORT_TIERS[0];
  for (const tier of SUPPORT_TIERS) {
    if (value >= tier.amount) selected = tier;
  }
  return selected;
}

function normalizeSupportAmount(value) {
  const amount = Number(value);
  const allowed = SUPPORT_TIERS.slice(0, 5).map((tier) => tier.amount);
  return allowed.includes(amount) ? amount : 0;
}

function getPaymentProvider() {
  return String(process.env.PAYMENT_PROVIDER || 'stripe').trim().toLowerCase();
}

function hasSupportPaymentEnv() {
  const provider = getPaymentProvider();
  if (provider !== 'stripe') return false;
  return !!String(process.env.STRIPE_SECRET_KEY || '').trim();
}

function getStripeKeyMode(secretKey = process.env.STRIPE_SECRET_KEY || '') {
  const key = String(secretKey || '').trim();
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  if (key) return 'unknown';
  return 'missing';
}

function isLivePaymentAllowed() {
  return String(process.env.PAYMENT_ALLOW_LIVE || '').trim().toLowerCase() === 'true';
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
  writeAuditLog,
  getLatestSubscription,
  normalizeSubscription,
  normalizeMemberProfile,
  upsertMemberProfile,
  getMemberProfile,
  SUPPORT_TIERS,
  getSupportTierForAmount,
  normalizeSupportAmount,
  getPaymentProvider,
  hasSupportPaymentEnv,
  getStripeKeyMode,
  isLivePaymentAllowed,
  supabaseRest,
};
