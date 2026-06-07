const { sendJson, getStripeKeyMode } = require('../_shared');

function hasValue(name) {
  return !!String(process.env[name] || '').trim();
}

const envGroups = {
  app: ['APP_BASE_URL', 'BETA_ADMIN_TOKEN'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_199_MONTHLY', 'STRIPE_PRICE_199_YEARLY', 'STRIPE_PRICE_599_MONTHLY', 'STRIPE_PRICE_599_YEARLY'],
  supportPayments: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
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
    price199Monthly: hasValue('STRIPE_PRICE_199_MONTHLY'),
    price199Yearly: hasValue('STRIPE_PRICE_199_YEARLY'),
    price599Monthly: hasValue('STRIPE_PRICE_599_MONTHLY'),
    price599Yearly: hasValue('STRIPE_PRICE_599_YEARLY'),
  };
  const supportPayments = {
    stripeSecretKey: hasValue('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: hasValue('STRIPE_WEBHOOK_SECRET'),
    supabaseUrl: hasValue('SUPABASE_URL'),
    supabaseServiceRoleKey: hasValue('SUPABASE_SERVICE_ROLE_KEY'),
    paymentMode: getStripeKeyMode(),
    liveAllowed: String(process.env.PAYMENT_ALLOW_LIVE || '').trim().toLowerCase() === 'true',
  };
  const app = {
    baseUrl: hasValue('APP_BASE_URL'),
    betaAdminToken: hasValue('BETA_ADMIN_TOKEN'),
  };
  const envStatus = {
    app: getGroupStatus({
      APP_BASE_URL: app.baseUrl,
      BETA_ADMIN_TOKEN: app.betaAdminToken,
    }),
    supabase: getGroupStatus({
      SUPABASE_URL: supabase.url,
      SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    }),
    stripe: getGroupStatus({
      STRIPE_SECRET_KEY: stripe.secretKey,
      STRIPE_WEBHOOK_SECRET: stripe.webhookSecret,
      STRIPE_PRICE_199_MONTHLY: stripe.price199Monthly,
      STRIPE_PRICE_199_YEARLY: stripe.price199Yearly,
      STRIPE_PRICE_599_MONTHLY: stripe.price599Monthly,
      STRIPE_PRICE_599_YEARLY: stripe.price599Yearly,
    }),
    supportPayments: getGroupStatus({
      STRIPE_SECRET_KEY: supportPayments.stripeSecretKey,
      STRIPE_WEBHOOK_SECRET: supportPayments.stripeWebhookSecret,
      SUPABASE_URL: supportPayments.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: supportPayments.supabaseServiceRoleKey,
    }),
  };
  const betaMissing = [
    ...envStatus.app.missing,
    ...envStatus.supabase.missing,
  ];
  const paidMissing = [
    ...betaMissing,
    ...envStatus.stripe.missing,
  ];
  const betaConfigured = betaMissing.length === 0;
  const paidConfigured = paidMissing.length === 0;
  return {
    configured: betaConfigured,
    betaConfigured,
    paidConfigured,
    mode: paidConfigured ? 'paid-production-ready-env' : betaConfigured ? 'public-beta-ready-env' : 'scaffold-env-missing',
    supabase,
    stripe,
    supportPayments,
    app,
    envGroups,
    envStatus,
    missing: betaMissing,
    paidMissing,
    nextActions: betaConfigured ? [
      'Run real Email OTP signup test.',
      'Run npm run beta:cloud-smoke with BETA_LIVE_ACCESS_TOKEN.',
      paidConfigured ? 'Paid launch env is ready.' : 'Stripe is optional during Public Beta and can be configured before paid launch.',
    ] : [
      envStatus.supabase.complete ? null : 'Create Supabase project, run supabase/schema.sql, then set Supabase env vars in Vercel.',
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
