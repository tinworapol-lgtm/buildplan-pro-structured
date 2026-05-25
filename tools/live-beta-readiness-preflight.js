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
  console.error('Live beta readiness preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const doctor = read('tools/live-beta-readiness-doctor.js');
const packageJson = readJson('package.json');
const docs = read('docs/LIVE_BETA_READINESS_PHASE_64C_TH.md');
const quality = read('tools/quality-gate.js');
const envExample = read('.env.example');

for (const marker of [
  'live-beta-readiness-phase-64C.json',
  '/api/system/readiness',
  '/api/session',
  '/api/license/status',
  '/api/projects',
  '/api/feedback',
  '/api/export',
  '/api/errors',
  'BETA_LIVE_ACCESS_TOKEN',
  'BETA_ADMIN_TOKEN',
  'no-secret-leak',
]) {
  if (!doctor.includes(marker)) fail('doctor missing marker', marker);
}

if (packageJson.scripts?.['beta:doctor'] !== 'node tools/live-beta-readiness-doctor.js') {
  fail('package.json missing beta:doctor script', JSON.stringify(packageJson.scripts));
}

for (const marker of ['BETA_LIVE_ACCESS_TOKEN', 'beta:doctor', 'live beta readiness']) {
  if (!docs.includes(marker)) fail('live beta docs missing marker', marker);
}

if (!envExample.includes('BETA_LIVE_ACCESS_TOKEN')) fail('.env.example missing BETA_LIVE_ACCESS_TOKEN');
if (!quality.includes('live-beta-readiness-preflight.js')) fail('quality gate missing live beta readiness preflight');

console.log('PASS live-beta-readiness-preflight');
