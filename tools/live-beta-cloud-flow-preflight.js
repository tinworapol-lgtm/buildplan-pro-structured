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
  console.error('Live beta cloud flow preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const smoke = read('tools/live-beta-cloud-flow-smoke.js');
const packageJson = readJson('package.json');
const docs = read('docs/LIVE_BETA_CLOUD_FLOW_PHASE_64D_TH.md');
const quality = read('tools/quality-gate.js');

for (const marker of [
  'live-beta-cloud-flow-phase-64D.json',
  'BETA_LIVE_ACCESS_TOKEN',
  'BUILDPLAN_PRODUCTION_URL',
  '/api/session',
  '/api/license/status',
  '/api/projects',
  'BuildPlan Pro Beta Smoke',
  'project.save',
  'project.load',
  'project.archive',
  'no-secret-leak',
]) {
  if (!smoke.includes(marker)) fail('smoke missing marker', marker);
}

if (packageJson.scripts?.['beta:cloud-smoke'] !== 'node tools/live-beta-cloud-flow-smoke.js') {
  fail('package.json missing beta:cloud-smoke script', JSON.stringify(packageJson.scripts));
}

for (const marker of ['beta:cloud-smoke', 'BETA_LIVE_ACCESS_TOKEN', 'live beta cloud flow']) {
  if (!docs.includes(marker)) fail('live beta cloud docs missing marker', marker);
}

if (!quality.includes('live-beta-cloud-flow-preflight.js')) {
  fail('quality gate missing live beta cloud flow preflight');
}

console.log('PASS live-beta-cloud-flow-preflight');
