const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'app-shell-phase-24.json');

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
  if (!fs.existsSync(filePath)) fail('Missing app shell file', relativePath);
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

for (const file of [
  'assets/js/services/app-shell.js',
  'assets/css/modules/05-app-shell.css',
  'tools/app-shell-smoke.js',
  'docs/APP_SHELL_PHASE_24.md',
]) readText(file);

const html = readText('index.html');
for (const marker of [
  'id="app-home-page"',
  'id="app-login-page"',
  'id="btn-home-open-workspace"',
  'id="btn-home-login"',
  'id="login-email"',
  'assets/js/services/app-shell.js',
]) {
  if (!html.includes(marker)) fail('index.html missing app shell marker', marker);
}

const config = readText('assets/js/config/app-config.js');
if (!config.includes("version: 'structured-phase-24'")) fail('Config version is not phase 24', 'structured-phase-24');

const cssEntry = readText('assets/css/buildplan.css');
if (!cssEntry.includes('./modules/05-app-shell.css')) fail('CSS entrypoint missing app shell module', '05-app-shell.css');

const publicApi = readText('assets/js/modules/09-public-api.js');
if (!publicApi.includes("BuildPlan.register('appShell'")) fail('Public API missing appShell namespace', 'appShell');

const shell = readText('assets/js/services/app-shell.js');
for (const marker of ['BuildPlanAppShell', 'navigateTo', 'home', 'login', 'workspace']) {
  if (!shell.includes(marker)) fail('App shell service missing marker', marker);
}

const manifest = readJson('release-manifest.json');
if (manifest.version !== 'structured-phase-24') fail('Release manifest phase is not 24', manifest.version);
if (manifest.appShell?.latestReport !== 'reports/app-shell-phase-24.json') {
  fail('Release manifest missing app shell report reference', manifest.appShell);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.['smoke:shell'] !== 'node tools/app-shell-smoke.js') {
  fail('package.json missing smoke:shell script', packageJson.scripts);
}

const quality = readText('tools/quality-gate.js');
if (!quality.includes("id: 'app-shell'")) fail('quality gate missing app shell step', 'tools/quality-gate.js');

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  routes: ['home', 'login', 'workspace'],
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('app shell preflight ok');
console.log('routes:', report.routes.length);
console.log('report:', path.relative(projectDir, reportPath));
