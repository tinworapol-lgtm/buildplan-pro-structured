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
  console.error('Beta env template preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const template = read('.env.beta.example');
const helper = read('tools/create-beta-env-template.js');
const packageJson = readJson('package.json');
const quality = read('tools/quality-gate.js');
const docs = read('docs/BETA_ACTIVATION_PHASE_67_TH.md');
const gitignore = read('.gitignore');

for (const marker of [
  'APP_BASE_URL=https://buildplan-pro-structured.vercel.app',
  'SUPABASE_URL=',
  'SUPABASE_ANON_KEY=',
  'SUPABASE_SERVICE_ROLE_KEY=',
  'BETA_ADMIN_TOKEN=',
  'BETA_TRIAL_DAYS=90',
  'BETA_PROJECT_LIMIT=10',
  'BETA_PROJECT_PAYLOAD_BYTES=750000',
  'Stripe is intentionally omitted for Public Beta',
]) {
  if (!template.includes(marker)) fail('template missing marker', marker);
}

for (const marker of [
  '.env.beta.example',
  '.env.production.local',
  'refusing to overwrite',
  '--force',
  'BETA_ADMIN_TOKEN',
]) {
  if (!helper.includes(marker)) fail('helper missing marker', marker);
}

if (packageJson.scripts?.['beta:env:init'] !== 'node tools/create-beta-env-template.js') {
  fail('package.json missing beta:env:init script', JSON.stringify(packageJson.scripts));
}

if (!quality.includes('beta-env-template-preflight.js')) {
  fail('quality gate missing beta env template preflight');
}

if (!docs.includes('beta:env:init') || !docs.includes('.env.beta.example')) {
  fail('docs missing beta env template instructions');
}

if (!gitignore.includes('.env.*.local')) {
  fail('.gitignore must ignore .env.production.local');
}

console.log('PASS beta-env-template-preflight');
