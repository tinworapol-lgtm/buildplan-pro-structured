const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'beta-activation-phase-67.json');
const envPath = path.join(projectDir, process.argv.find((item) => item.startsWith('--file='))?.slice(7) || '.env.production.local');

const requiredEnv = [
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BETA_ADMIN_TOKEN',
];

const optionalBetaEnv = [
  { name: 'BETA_TRIAL_DAYS', defaultValue: '90' },
  { name: 'BETA_PROJECT_LIMIT', defaultValue: '10' },
  { name: 'BETA_PROJECT_PAYLOAD_BYTES', defaultValue: '750000' },
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
const required = requiredEnv.map((name) => ({
  name,
  present: !!String(values[name] || '').trim(),
  preview: redact(String(values[name] || '').trim()),
  vercelCommand: 'vercel env add ' + name + ' production',
}));
const optional = optionalBetaEnv.map((item) => ({
  name: item.name,
  present: !!String(values[item.name] || '').trim(),
  value: String(values[item.name] || item.defaultValue),
  defaultValue: item.defaultValue,
  vercelCommand: 'vercel env add ' + item.name + ' production',
}));
const missing = required.filter((item) => !item.present).map((item) => item.name);

const checks = [
  {
    id: 'schema-ready',
    ok: fs.existsSync(path.join(projectDir, 'supabase/schema.sql')),
    action: 'Run supabase/schema.sql in Supabase SQL Editor before accepting real signups.',
  },
  {
    id: 'member-preflight',
    ok: fs.existsSync(path.join(projectDir, 'tools/member-signup-preflight.js')),
    action: 'Run npm run beta:member-preflight.',
  },
  {
    id: 'doctor-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/live-beta-readiness-doctor.js')),
    action: 'Run npm run beta:doctor after Vercel env values are deployed.',
  },
  {
    id: 'cloud-smoke-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/live-beta-cloud-flow-smoke.js')),
    action: 'Run npm run beta:cloud-smoke with BETA_LIVE_ACCESS_TOKEN after signup works.',
  },
];

const nextActions = exists ? [
  missing.length ? 'Fill missing values in ' + path.relative(projectDir, envPath) + ': ' + missing.join(', ') : 'Add required beta env values to Vercel production.',
  'Run supabase/schema.sql in Supabase SQL Editor.',
  'Deploy production after env values are set.',
  'Run npm run beta:member-preflight.',
  'Run npm run beta:doctor.',
  'Signup with a real test email and copy the session token into BETA_LIVE_ACCESS_TOKEN.',
  'Run npm run beta:cloud-smoke.',
] : [
  'Copy .env.example or .env.production.example to .env.production.local.',
  'Fill APP_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and BETA_ADMIN_TOKEN.',
  'Run npm run beta:activation-plan again.',
];

const report = {
  phase: 'phase-67-beta-activation-plan',
  checkedAt: new Date().toISOString(),
  ok: exists && missing.length === 0 && checks.every((item) => item.ok),
  envFile: path.relative(projectDir, envPath),
  envFileExists: exists,
  required,
  optional,
  missing,
  checks,
  notes: [
    'Stripe is intentionally optional for public beta.',
    'Public beta uses free 90-day trial access with package 599.',
    'Do not store BETA_LIVE_ACCESS_TOKEN in committed files.',
  ],
  nextActions,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('BuildPlan Pro Beta Activation Plan');
console.log('env file:', report.envFile, exists ? '(found)' : '(missing)');
console.log('ready:', report.ok);
for (const item of required) {
  console.log('-', item.name + ':', item.present ? 'set ' + item.preview : 'missing');
}
for (const item of optional) {
  console.log('-', item.name + ':', item.present ? 'set ' + item.value : 'default ' + item.defaultValue);
}
console.log('required commands after values are ready:');
console.log(' npm run beta:member-preflight');
console.log(' npm run beta:doctor');
console.log(' npm run beta:cloud-smoke');
console.log(' schema:', 'supabase/schema.sql');
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) process.exitCode = 1;
