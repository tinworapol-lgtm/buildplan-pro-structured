const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'supabase-beta-activation-phase-72.json');
const envPath = path.join(projectDir, process.argv.find((item) => item.startsWith('--file='))?.slice(7) || '.env.production.local');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const schema = read('supabase/schema.sql');
const envExists = fs.existsSync(envPath);
const envValues = envExists ? parseEnv(fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')) : {};

const requiredEnv = [
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BETA_ADMIN_TOKEN',
];

const checks = [
  {
    id: 'env-file-present',
    ok: envExists,
    action: 'Run npm run beta:env:init -- --write and fill .env.production.local.',
  },
  ...requiredEnv.map((name) => ({
    id: `env-${name.toLowerCase()}`,
    ok: !!String(envValues[name] || '').trim(),
    action: `Set ${name} in .env.production.local and Vercel production.`,
  })),
  {
    id: 'schema-has-rls',
    ok: /enable row level security/i.test(schema) && /create policy/i.test(schema),
    action: 'Apply supabase/schema.sql in Supabase SQL Editor.',
  },
  {
    id: 'schema-has-data-api-grants',
    ok: /grant select, update on public\.profiles to authenticated/i.test(schema)
      && /grant select, insert, update, delete on public\.projects to authenticated/i.test(schema),
    action: 'Keep explicit authenticated grants because Data API exposure can require them.',
  },
  {
    id: 'member-signup-preflight-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/member-signup-preflight.js')),
    action: 'Run npm run beta:member-preflight.',
  },
  {
    id: 'beta-env-push-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/beta-env-push.ps1')),
    action: 'Run npm run beta:env:push:dry, then npm run beta:env:push.',
  },
  {
    id: 'live-doctor-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/live-beta-readiness-doctor.js')),
    action: 'Run npm run beta:doctor after deploy.',
  },
  {
    id: 'cloud-smoke-ready',
    ok: fs.existsSync(path.join(projectDir, 'tools/live-beta-cloud-flow-smoke.js')),
    action: 'Run npm run beta:cloud-smoke with BETA_LIVE_ACCESS_TOKEN after real OTP login.',
  },
];

const report = {
  phase: 'phase-72-supabase-beta-activation',
  checkedAt: new Date().toISOString(),
  ok: checks.every((check) => check.ok),
  envFile: path.relative(projectDir, envPath),
  envFileExists: envExists,
  checks,
  runOrder: [
    'Create Supabase production project.',
    'Enable Email OTP in Supabase Auth.',
    'Apply supabase/schema.sql in SQL Editor.',
    'Run npm run beta:env:init -- --write and fill .env.production.local.',
    'Run npm run beta:env:push:dry.',
    'Run npm run beta:env:push.',
    'Deploy production.',
    'Run npm run beta:doctor.',
    'Signup with a real email, then run npm run beta:cloud-smoke with BETA_LIVE_ACCESS_TOKEN.',
  ],
  notes: [
    'Stripe is intentionally not part of Phase 72.',
    'Do not commit .env.production.local or any Supabase service role key.',
    'Supabase Data API access is protected by explicit grants plus RLS policies in supabase/schema.sql.',
  ],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

for (const check of checks) {
  console.log(check.ok ? 'PASS' : 'TODO', check.id);
  if (!check.ok) console.log('  next:', check.action);
}
console.log('ready:', report.ok);
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) process.exitCode = 1;
