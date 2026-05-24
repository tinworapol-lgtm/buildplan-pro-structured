const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'saas-readiness-phase-18.json');
const strict = process.argv.includes('--require-production-env');

const requiredEnv = [
  'APP_BASE_URL',
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

function hasValue(name) {
  return !!String(process.env[name] || '').trim();
}

const env = Object.fromEntries(requiredEnv.map((name) => [name, hasValue(name)]));
const missing = Object.entries(env).filter(([, ok]) => !ok).map(([name]) => name);

const requiredFiles = [
  '.env.example',
  'api/system/readiness.js',
  'api/session.js',
  'api/license/status.js',
  'api/checkout.js',
  'api/projects/index.js',
  'api/webhooks/stripe.js',
  'supabase/schema.sql',
  'contracts/saas-readiness.contract.json',
  'docs/SAAS_ACTIVATION_RUNBOOK_TH.md',
];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(projectDir, file)));
const ok = missingFiles.length === 0 && (!strict || missing.length === 0);

const report = {
  ok,
  strict,
  checkedAt: new Date().toISOString(),
  files: {
    required: requiredFiles.length,
    missing: missingFiles,
  },
  env,
  missingEnv: missing,
  nextAction: missing.length
    ? 'Set missing environment variables in Vercel before enabling paid mode.'
    : 'Environment variables are present. Run browser and payment webhook smoke tests next.',
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('saas readiness check', ok ? 'ok' : 'needs action');
console.log('strict:', strict);
console.log('missing files:', missingFiles.length);
console.log('missing env:', missing.length);
console.log('report:', path.relative(projectDir, reportPath));

if (!ok) process.exitCode = 1;
