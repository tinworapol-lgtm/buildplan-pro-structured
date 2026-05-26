const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(label, detail = '') {
  console.error('Beta activation preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const tool = read('tools/beta-activation-plan.js');
const packageJson = readJson('package.json');
const quality = read('tools/quality-gate.js');
const docs = read('docs/BETA_ACTIVATION_PHASE_67_TH.md');

for (const marker of [
  'beta-activation-phase-67.json',
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BETA_ADMIN_TOKEN',
  'BETA_TRIAL_DAYS',
  'BETA_PROJECT_LIMIT',
  'BETA_PROJECT_PAYLOAD_BYTES',
  'supabase/schema.sql',
  'npm run beta:member-preflight',
  'npm run beta:doctor',
  'npm run beta:cloud-smoke',
  'Stripe is intentionally optional for public beta',
]) {
  if (!tool.includes(marker)) fail('activation tool missing marker', marker);
}

if (packageJson.scripts?.['beta:activation-plan'] !== 'node tools/beta-activation-plan.js') {
  fail('package.json missing beta:activation-plan script', JSON.stringify(packageJson.scripts));
}

if (!quality.includes('beta-activation-preflight.js')) {
  fail('quality gate missing beta activation preflight');
}

for (const marker of ['beta:activation-plan', 'Supabase', 'สมัครสมาชิกฟรี', 'ไม่ต้องตั้ง Stripe']) {
  if (!docs.includes(marker)) fail('docs missing marker', marker);
}

console.log('PASS beta-activation-preflight');
