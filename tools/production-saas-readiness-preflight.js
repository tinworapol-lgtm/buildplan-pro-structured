const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'production-saas-readiness-phase-23.json');

function fail(message, detail) {
  const report = { ok: false, checkedAt: new Date().toISOString(), message, detail };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function readText(relativePath) {
  const filePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(filePath)) fail('Missing production SaaS readiness file', relativePath);
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

for (const file of ['tools/production-saas-readiness-smoke.js', 'docs/PRODUCTION_SAAS_READINESS_PHASE_23.md']) {
  readText(file);
}

const smoke = readText('tools/production-saas-readiness-smoke.js');
for (const marker of [
  'production-saas-readiness-phase-23.json',
  '/api/system/readiness',
  'SUPABASE_URL',
  'STRIPE_SECRET_KEY',
  'secretLeak',
]) {
  if (!smoke.includes(marker)) fail('Production SaaS readiness smoke missing marker', marker);
}

const manifest = readJson('release-manifest.json');
if (manifest.version !== 'structured-phase-24') fail('Release manifest phase is not 23', manifest.version);
if (manifest.productionSaaSReadiness?.latestReport !== 'reports/production-saas-readiness-phase-23.json') {
  fail('Release manifest missing production SaaS readiness report reference', manifest.productionSaaSReadiness);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.['smoke:saas'] !== 'node tools/production-saas-readiness-smoke.js') {
  fail('package.json missing smoke:saas script', packageJson.scripts);
}

const quality = readText('tools/quality-gate.js');
if (!quality.includes("id: 'production-saas-readiness-preflight'")) {
  fail('quality gate missing production SaaS readiness preflight step', 'tools/quality-gate.js');
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: 2,
  expectedSmokeTool: 'tools/production-saas-readiness-smoke.js',
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('production SaaS readiness preflight ok');
console.log('files:', report.files);
console.log('report:', path.relative(projectDir, reportPath));
