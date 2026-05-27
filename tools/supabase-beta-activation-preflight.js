const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Supabase beta activation preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const activation = read('tools/supabase-beta-activation.js');
const envPush = read('tools/beta-env-push.ps1');
const packageJson = JSON.parse(read('package.json'));
const quality = read('tools/quality-gate.js');
const docs = read('docs/SUPABASE_BETA_ACTIVATION_PHASE_72_TH.md');
const changelog = read('CHANGELOG.md');

for (const marker of [
  'supabase-beta-activation-phase-72.json',
  'schema-has-rls',
  'schema-has-data-api-grants',
  'BETA_LIVE_ACCESS_TOKEN',
  'Stripe is intentionally not part of Phase 72',
]) {
  if (!activation.includes(marker)) fail('activation tool missing marker', marker);
}

for (const marker of [
  'BuildPlan Pro Public Beta Vercel Env Push',
  'SUPABASE_SERVICE_ROLE_KEY',
  'Stripe env is intentionally not required for Public Beta',
  '-Apply',
]) {
  if (!envPush.includes(marker)) fail('beta env push helper missing marker', marker);
}

if (packageJson.scripts?.['beta:supabase-activation'] !== 'node tools/supabase-beta-activation.js') {
  fail('package.json missing beta:supabase-activation script');
}
if (packageJson.scripts?.['beta:env:push:dry'] !== 'powershell -ExecutionPolicy Bypass -File tools/beta-env-push.ps1') {
  fail('package.json missing beta:env:push:dry script');
}
if (packageJson.scripts?.['beta:env:push'] !== 'powershell -ExecutionPolicy Bypass -File tools/beta-env-push.ps1 -Apply') {
  fail('package.json missing beta:env:push script');
}

if (!quality.includes('supabase-beta-activation-preflight.js')) {
  fail('quality gate missing Supabase beta activation preflight');
}

for (const marker of [
  'npm run beta:supabase-activation',
  'npm run beta:env:push:dry',
  'supabase/schema.sql',
  'Email OTP',
  'ไม่ต้องตั้ง Stripe',
]) {
  if (!docs.includes(marker)) fail('docs missing marker', marker);
}

if (!changelog.includes('phase-72-supabase-beta-activation')) {
  fail('changelog missing phase 72 entry');
}

console.log('PASS supabase-beta-activation-preflight');
