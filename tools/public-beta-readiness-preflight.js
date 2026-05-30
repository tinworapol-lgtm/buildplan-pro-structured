const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Public beta readiness preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const readiness = read('api/system/readiness.js');
const adapter = read('assets/js/services/saas-readiness-adapter.js');
const appShell = read('assets/js/services/app-shell.js');
const quality = read('tools/quality-gate.js');
const changelog = read('CHANGELOG.md');

for (const marker of ['betaConfigured', 'paidConfigured', 'public-beta-ready-env', 'Stripe is optional during Public Beta', 'paidMissing']) {
  if (!readiness.includes(marker)) fail('readiness API missing marker', marker);
}

for (const marker of ['betaConfigured', 'paidConfigured', 'paidMissing']) {
  if (!adapter.includes(marker)) fail('readiness adapter missing marker', marker);
}

for (const marker of ["config.licensing?.mode === 'public-beta'", 'publicFreeAccess', 'ใช้ฟรีช่วงทดสอบ']) {
  if (!appShell.includes(marker)) fail('app shell signup readiness missing marker', marker);
}

if (!quality.includes('public-beta-readiness-preflight.js')) {
  fail('quality gate missing public beta readiness preflight');
}

if (!changelog.includes('phase-73-public-beta-readiness')) {
  fail('changelog missing phase 73 entry');
}

console.log('PASS public-beta-readiness-preflight');
