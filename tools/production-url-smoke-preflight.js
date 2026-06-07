const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'production-url-smoke-phase-38.json');

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
  if (!fs.existsSync(filePath)) fail('Missing production smoke file', relativePath);
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

for (const file of ['tools/production-url-smoke.js', 'docs/PRODUCTION_URL_SMOKE_PHASE_21.md']) {
  readText(file);
}

const smoke = readText('tools/production-url-smoke.js');
for (const marker of [
  'production-url-smoke-phase-38.json',
  'btn-account-cloud',
  'account-cloud-ui.js',
  'structured-phase-24',
  'has-ct-saas-landing',
  'ct-saas-mock-app.js?v=phase41',
  'has-public-free-support-landing',
  'ct-mock-app-has-support-modal',
  'app-shell.js?v=phase31',
  'public-free-access-config',
  'ct-mock-app-public-unlock',
  'has-ct-subscription-panel',
  'has-ct-billing-modal',
]) {
  if (!smoke.includes(marker)) fail('Production smoke tool missing marker', marker);
}

const manifest = readJson('release-manifest.json');
if (manifest.version !== 'structured-phase-24') fail('Release manifest phase is not 24', manifest.version);
if (manifest.productionUrlSmoke?.latestReport !== 'reports/production-url-smoke-phase-38.json') {
  fail('Release manifest missing production URL smoke report reference', manifest.productionUrlSmoke);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.['smoke:prod'] !== 'node tools/production-url-smoke.js') {
  fail('package.json missing smoke:prod script', packageJson.scripts);
}

const quality = readText('tools/quality-gate.js');
if (!quality.includes("id: 'production-url-smoke-preflight'")) {
  fail('quality gate missing production smoke preflight step', 'tools/quality-gate.js');
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: 2,
  expectedSmokeTool: 'tools/production-url-smoke.js',
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('production URL smoke preflight ok');
console.log('files:', report.files);
console.log('report:', path.relative(projectDir, reportPath));
