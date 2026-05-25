const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'production-saas-readiness-phase-23.json');

const expectedEnvNames = [
  'APP_BASE_URL',
  'BETA_ADMIN_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_199_MONTHLY',
  'STRIPE_PRICE_199_YEARLY',
  'STRIPE_PRICE_599_MONTHLY',
  'STRIPE_PRICE_599_YEARLY',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function getProductionUrl() {
  const manifest = readJson('release-manifest.json');
  return (process.env.BUILDPLAN_PRODUCTION_URL || manifest.webDeploy?.productionUrl || '').trim().replace(/\/$/, '');
}

function findSecretLeak(payloadText) {
  const suspicious = [
    /sk_live_[A-Za-z0-9]/,
    /sk_test_[A-Za-z0-9]/,
    /whsec_[A-Za-z0-9]/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  ];
  return suspicious.some((pattern) => pattern.test(payloadText));
}

async function main() {
  const productionUrl = getProductionUrl();
  const endpoint = productionUrl + '/api/system/readiness';
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch (error) {
    payload = { parseError: error.message };
  }

  const missing = Array.isArray(payload.missing) ? payload.missing : [];
  const secretLeak = findSecretLeak(text);
  const checks = [
    { id: 'http-200', ok: response.status === 200, detail: String(response.status) },
    { id: 'json-response', ok: !payload.parseError, detail: payload.parseError || '' },
    { id: 'has-configured-boolean', ok: typeof payload.configured === 'boolean', detail: typeof payload.configured },
    { id: 'has-missing-array', ok: Array.isArray(payload.missing), detail: String(Array.isArray(payload.missing)) },
    { id: 'reports-known-env-names', ok: missing.every((name) => expectedEnvNames.includes(name)), detail: missing.join(', ') },
    { id: 'no-secret-leak', ok: !secretLeak, detail: secretLeak ? 'secret-like value detected' : '' },
  ];

  const report = {
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    endpoint,
    status: response.status,
    configured: !!payload.configured,
    mode: payload.mode || '',
    missingEnv: missing,
    checks,
    nextAction: payload.configured
      ? 'Production SaaS environment appears configured. Run OTP, checkout, webhook, and cloud save live tests.'
      : 'Set missing Supabase/Stripe/Vercel environment variables, redeploy, then rerun npm run smoke:saas.',
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  for (const check of checks) console.log(check.ok ? 'PASS' : 'FAIL', check.id);
  console.log('configured:', report.configured);
  console.log('missing env:', missing.length);
  console.log('report:', path.relative(projectDir, reportPath));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    endpoint: getProductionUrl() + '/api/system/readiness',
    error: error.message,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.error(error.message);
  console.log('report:', path.relative(projectDir, reportPath));
  process.exitCode = 1;
});
