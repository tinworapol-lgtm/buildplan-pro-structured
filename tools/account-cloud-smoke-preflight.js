const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'account-cloud-smoke-phase-20.json');

function fail(message, detail) {
  const report = { ok: false, checkedAt: new Date().toISOString(), message, detail };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function readText(relativePath) {
  const absolutePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(absolutePath)) fail('Missing account/cloud smoke file', relativePath);
  return fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const requiredFiles = [
  'tools/browser-account-cloud-smoke.js',
  'docs/ACCOUNT_CLOUD_SMOKE_PHASE_20.md',
];
for (const file of requiredFiles) readText(file);

const smoke = readText('tools/browser-account-cloud-smoke.js');
for (const marker of [
  'btn-account-cloud',
  'account-cloud-panel',
  'BuildPlanAccountCloud',
  'account-cloud-smoke-phase-20.json',
]) {
  if (!smoke.includes(marker)) fail('Smoke tool missing marker', marker);
}

const manifest = readJson('release-manifest.json');
if (!['structured-phase-20', 'structured-phase-24'].includes(manifest.version)) fail('Release manifest phase is not account/cloud smoke ready', manifest.version);
if (manifest.accountCloudSmoke?.latestReport !== 'reports/account-cloud-smoke-phase-20.json') {
  fail('Release manifest missing account/cloud smoke report reference', manifest.accountCloudSmoke);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.['smoke:account'] !== 'node tools/browser-account-cloud-smoke.js') {
  fail('package.json missing smoke:account script', packageJson.scripts);
}

const quality = readText('tools/quality-gate.js');
if (!quality.includes("id: 'account-cloud-smoke'")) {
  fail('quality gate missing account-cloud-smoke step', 'tools/quality-gate.js');
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: requiredFiles.length,
  expectedSmokeTool: 'tools/browser-account-cloud-smoke.js',
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('account/cloud smoke preflight ok');
console.log('files:', report.files);
console.log('report:', path.relative(projectDir, reportPath));
