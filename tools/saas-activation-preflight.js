const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'saas-activation-phase-18.json');

function readText(relativePath) {
  const absolutePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(absolutePath)) fail('Missing SaaS activation file', relativePath);
  return fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function fail(message, detail) {
  const report = { ok: false, checkedAt: new Date().toISOString(), message, detail };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

const requiredFiles = [
  'api/system/readiness.js',
  'assets/js/services/saas-readiness-adapter.js',
  'contracts/saas-readiness.contract.json',
  'tools/saas-readiness-check.js',
  'docs/SAAS_ACTIVATION_RUNBOOK_TH.md',
  'docs/VERCEL_ENV_SETUP_PHASE_18.md',
];
for (const file of requiredFiles) readText(file);

const config = readText('assets/js/config/app-config.js');
for (const marker of [
  "version: 'structured-phase-24'",
  "system: {",
  "readiness: '/api/system/readiness'",
]) {
  if (!config.includes(marker)) fail('Public beta config missing SaaS readiness marker', marker);
}

const html = readText('index.html');
if (!html.includes('assets/js/services/saas-readiness-adapter.js')) {
  fail('index.html does not load SaaS readiness adapter', 'assets/js/services/saas-readiness-adapter.js');
}

const publicApi = readText('assets/js/modules/09-public-api.js');
if (!publicApi.includes("BuildPlan.register('saas'")) {
  fail('Missing public SaaS namespace', 'saas');
}

const contract = readJson('contracts/saas-readiness.contract.json');
if (!contract.endpoints?.some((endpoint) => endpoint.method === 'GET' && endpoint.path === '/api/system/readiness')) {
  fail('SaaS readiness contract missing readiness endpoint', contract.endpoints);
}

const manifest = readJson('release-manifest.json');
if (!['structured-phase-18', 'structured-phase-19', 'structured-phase-20', 'structured-phase-24'].includes(manifest.version)) fail('Release manifest phase is not SaaS activation ready', manifest.version);
if (manifest.saasActivation?.latestReport !== 'reports/saas-activation-phase-18.json') {
  fail('Release manifest missing SaaS activation report reference', manifest.saasActivation);
}
if (!manifest.modules?.services?.includes('assets/js/services/saas-readiness-adapter.js')) {
  fail('Manifest missing SaaS readiness service', manifest.modules?.services);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.['saas:check'] !== 'node tools/saas-readiness-check.js') {
  fail('package.json missing saas:check script', packageJson.scripts);
}

const checkTool = readText('tools/saas-readiness-check.js');
if (!checkTool.includes('--require-production-env')) {
  fail('SaaS readiness check must support strict production mode', 'tools/saas-readiness-check.js');
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: requiredFiles.length,
  readinessEndpoint: true,
  strictMode: true,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('saas activation preflight ok');
console.log('files:', report.files);
console.log('report:', path.relative(projectDir, reportPath));
