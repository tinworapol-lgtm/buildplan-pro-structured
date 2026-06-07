const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'support-testmode-readiness-phase-71.json');

function hasValue(name) {
  return !!String(process.env[name] || '').trim();
}

function stripeMode() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  if (key) return 'unknown';
  return 'missing';
}

const required = [
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

const missing = required.filter((name) => !hasValue(name));
const mode = stripeMode();
const liveAllowed = String(process.env.PAYMENT_ALLOW_LIVE || '').trim().toLowerCase() === 'true';
const ok = missing.length === 0 && mode === 'test';
const blockedLive = mode === 'live' && !liveAllowed;

const report = {
  ok,
  checkedAt: new Date().toISOString(),
  mode,
  blockedLive,
  missing,
  nextActions: ok ? [
    'Run a Stripe Checkout test payment with a test card.',
    'Confirm /api/webhooks/stripe receives checkout.session.completed.',
    'Confirm support_payments row becomes paid in Supabase.',
  ] : [
    missing.length ? 'Set missing env vars in Vercel Production using test-mode Stripe values.' : null,
    mode === 'missing' ? 'Add STRIPE_SECRET_KEY=sk_test_...' : null,
    mode === 'unknown' ? 'Use a valid Stripe test secret key that starts with sk_test_.' : null,
    blockedLive ? 'Replace sk_live_... with sk_test_... for this validation run.' : null,
    'Run supabase/schema.sql in Supabase SQL Editor if support_payments is not present.',
  ].filter(Boolean),
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('support test mode readiness', ok ? 'ok' : 'needs action');
console.log('stripe mode:', mode);
console.log('missing env:', missing.length);
console.log('blocked live:', blockedLive);
console.log('report:', path.relative(projectDir, reportPath));
if (!ok) process.exitCode = 1;
