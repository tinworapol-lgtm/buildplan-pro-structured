const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'account-cloud-phase-19.json');

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
  if (!fs.existsSync(absolutePath)) fail('Missing account/cloud file', relativePath);
  return fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const requiredFiles = [
  'api/auth/start.js',
  'api/auth/verify.js',
  'assets/js/services/account-cloud-ui.js',
  'contracts/auth-otp-api.contract.json',
  'docs/ACCOUNT_CLOUD_UI_PHASE_19.md',
];
for (const file of requiredFiles) readText(file);

const config = readText('assets/js/config/app-config.js');
for (const marker of [
  "version: 'structured-phase-24'",
  "startOtp: '/api/auth/start'",
  "verifyOtp: '/api/auth/verify'",
]) {
  if (!config.includes(marker)) fail('Public beta config missing account/cloud marker', marker);
}

const authAdapter = readText('assets/js/services/auth-adapter.js');
for (const marker of ['requestEmailOtp', 'verifyEmailOtp', 'setAccessToken']) {
  if (!authAdapter.includes(marker)) fail('Auth adapter missing OTP marker', marker);
}

const html = readText('index.html');
if (!html.includes('assets/js/services/account-cloud-ui.js')) {
  fail('index.html does not load account/cloud UI', 'assets/js/services/account-cloud-ui.js');
}
if (!html.includes('id="btn-account-cloud"')) {
  fail('Top ribbon missing account/cloud button', 'btn-account-cloud');
}

const publicApi = readText('assets/js/modules/09-public-api.js');
for (const namespace of ['accountCloud']) {
  if (!publicApi.includes("BuildPlan.register('" + namespace + "'")) {
    fail('Missing account/cloud namespace', namespace);
  }
}

const contract = readJson('contracts/auth-otp-api.contract.json');
for (const methodPath of ['POST /api/auth/start', 'POST /api/auth/verify']) {
  if (!contract.endpoints?.some((endpoint) => endpoint.method + ' ' + endpoint.path === methodPath)) {
    fail('Auth OTP contract missing endpoint', methodPath);
  }
}

const manifest = readJson('release-manifest.json');
if (!['structured-phase-19', 'structured-phase-20', 'structured-phase-24'].includes(manifest.version)) fail('Release manifest phase is not account/cloud ready', manifest.version);
if (manifest.accountCloud?.latestReport !== 'reports/account-cloud-phase-19.json') {
  fail('Release manifest missing account/cloud report reference', manifest.accountCloud);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.account !== 'node tools/account-cloud-preflight.js') {
  fail('package.json missing account preflight script', packageJson.scripts);
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: requiredFiles.length,
  authOtpRoutes: 2,
  uiAdapter: true,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('account/cloud preflight ok');
console.log('auth otp routes:', report.authOtpRoutes);
console.log('report:', path.relative(projectDir, reportPath));
