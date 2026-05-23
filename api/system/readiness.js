const { sendJson } = require('../_shared');

function hasValue(name) {
  return !!String(process.env[name] || '').trim();
}

const envGroups = {
  app: ['APP_BASE_URL'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY'],
};

function getGroupStatus(values) {
  const entries = Object.entries(values);
  const ready = entries.filter(([, ok]) => ok).map(([name]) => name);
  const missing = entries.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    ready,
    missing,
    readyCount: ready.length,
    totalCount: entries.length,
    complete: missing.length === 0,
  };
}

function getReadiness() {
  const supabase = {
    url: hasValue('SUPABASE_URL'),
    anonKey: hasValue('SUPABASE_ANON_KEY'),
    serviceRoleKey: hasValue('SUPABASE_SERVICE_ROLE_KEY'),
  };
  const stripe = {
    secretKey: hasValue('STRIPE_SECRET_KEY'),
    webhookSecret: hasValue('STRIPE_WEBHOOK_SECRET'),
    monthlyPrice: hasValue('STRIPE_PRICE_MONTHLY'),
    yearlyPrice: hasValue('STRIPE_PRICE_YEARLY'),
  };
  const app = {
    baseUrl: hasValue('APP_BASE_URL'),
  };
  const envStatus = {
    app: getGroupStatus({
      APP_BASE_URL: app.baseUrl,
    }),
    supabase: getGroupStatus({
      SUPABASE_URL: supabase.url,
      SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    }),
    stripe: getGroupStatus({
      STRIPE_SECRET_KEY: stripe.secretKey,
      STRIPE_WEBHOOK_SECRET: stripe.webhookSecret,
      STRIPE_PRICE_MONTHLY: stripe.monthlyPrice,
      STRIPE_PRICE_YEARLY: stripe.yearlyPrice,
    }),
  };
  const missing = [
    ...envStatus.app.missing,
    ...envStatus.supabase.missing,
    ...envStatus.stripe.missing,
  ];
  const configured = missing.length === 0;
  return {
    configured,
    mode: configured ? 'production-ready-env' : 'scaffold-env-missing',
    supabase,
    stripe,
    app,
    envGroups,
    envStatus,
    missing,
    nextActions: configured ? [
      'Run production smoke tests with a paid test account.',
      'Enable paid mode messaging in the public UI.',
    ] : [
      envStatus.supabase.complete ? null : 'Create Supabase project, run supabase/schema.sql, then set Supabase env vars in Vercel.',
      envStatus.stripe.complete ? null : 'Create Stripe monthly/yearly prices, configure webhook, then set Stripe env vars in Vercel.',
      envStatus.app.complete ? null : 'Set APP_BASE_URL to the production domain.',
      'Redeploy production after env vars are set.',
    ].filter(Boolean),
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { message: 'Method not allowed' });
  }
  return sendJson(response, 200, getReadiness());
};
