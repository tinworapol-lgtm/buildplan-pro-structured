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
  console.error('Member signup smoke preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const smoke = read('tools/member-signup-smoke.js');
const packageJson = readJson('package.json');
const quality = read('tools/quality-gate.js');

for (const marker of [
  'member-signup-smoke-phase-66.json',
  'member-signup-modal',
  'submitSignupProfile',
  'verifySignupCode',
  'ระบบสมาชิกยังไม่เปิดใช้งาน',
  'memberProfile',
  'BuildPlanAuth.requestEmailOtp',
  'BuildPlanAuth.verifyEmailOtp',
  'route-workspace-after-signup',
]) {
  if (!smoke.includes(marker)) fail('smoke missing marker', marker);
}

if (packageJson.scripts?.['smoke:member-signup'] !== 'node tools/member-signup-smoke.js') {
  fail('package.json missing smoke:member-signup script', JSON.stringify(packageJson.scripts));
}

if (!quality.includes('member-signup-smoke-preflight.js') || !quality.includes('member-signup-smoke.js')) {
  fail('quality gate missing member signup smoke steps');
}

console.log('PASS member-signup-smoke-preflight');
