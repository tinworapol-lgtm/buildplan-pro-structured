const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Function budget audit preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const audit = read('tools/function-budget-audit.js');
const packageJson = JSON.parse(read('package.json'));
const quality = read('tools/quality-gate.js');
const docs = read('docs/VERCEL_FUNCTION_BUDGET_TH.md');
const vercel = read('vercel.json');
const changelog = read('CHANGELOG.md');

for (const marker of [
  'function-budget-audit-phase-71.json',
  'automatic-api-checks-disabled',
  'frontend-error-logging-disabled',
  'asset-long-cache',
  '/api/system/readiness',
  'Vercel usage warnings are based on accumulated billing-period invocations',
]) {
  if (!audit.includes(marker)) fail('audit missing marker', marker);
}

if (packageJson.scripts?.['ops:function-budget'] !== 'node tools/function-budget-audit.js') {
  fail('package.json missing ops:function-budget script');
}

if (!quality.includes('function-budget-audit-preflight.js') || !quality.includes('function-budget-audit.js')) {
  fail('quality gate missing function budget audit steps');
}

if (!vercel.includes('max-age=31536000, immutable')) {
  fail('vercel asset cache header must be long-cache immutable');
}

for (const marker of [
  'npm run ops:function-budget',
  'npm run smoke:static-first',
  'ยอดสะสม',
]) {
  if (!docs.includes(marker)) fail('docs missing marker', marker);
}

if (!changelog.includes('phase-71-function-budget-audit')) {
  fail('changelog missing phase 71 entry');
}

console.log('PASS function-budget-audit-preflight');
