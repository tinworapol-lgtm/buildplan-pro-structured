const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'vercel-env-plan-phase-33.json');
const envPath = path.join(projectDir, process.argv.find((item) => item.startsWith('--file='))?.slice(7) || '.env.production.local');

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

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function redact(value) {
  if (!value) return '';
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

const exists = fs.existsSync(envPath);
const values = exists ? parseEnv(fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')) : {};
const entries = requiredEnv.map((name) => ({
  name,
  present: !!String(values[name] || '').trim(),
  preview: redact(String(values[name] || '').trim()),
  command: 'vercel env add ' + name + ' production',
}));
const missing = entries.filter((item) => !item.present).map((item) => item.name);
const report = {
  ok: exists && missing.length === 0,
  checkedAt: new Date().toISOString(),
  envFile: path.relative(projectDir, envPath),
  envFileExists: exists,
  required: requiredEnv.length,
  missing,
  entries,
  nextActions: exists ? (
    missing.length
      ? ['Fill missing values in ' + path.relative(projectDir, envPath) + '.', 'Run npm run saas:env again.', 'Add each env to Vercel production.', 'Deploy production.']
      : ['Add each env to Vercel production using the listed commands.', 'Run vercel --prod.', 'Run npm run saas:doctor.']
  ) : [
    'Copy .env.production.example to .env.production.local.',
    'Fill Supabase and Stripe values.',
    'Run npm run saas:env again.',
  ],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('BuildPlan Pro Vercel Env Plan');
console.log('env file:', report.envFile, exists ? '(found)' : '(missing)');
console.log('ready:', report.ok);
for (const item of entries) {
  console.log('-', item.name + ':', item.present ? 'set ' + item.preview : 'missing');
}
console.log('commands to run after values are filled:');
for (const item of entries) console.log(' ', item.command);
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) process.exitCode = 1;
