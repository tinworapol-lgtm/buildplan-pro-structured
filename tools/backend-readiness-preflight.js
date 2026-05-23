const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'backend-readiness-phase-17.json');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function fail(message, detail) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    message,
    detail,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function requireFile(relativePath) {
  const absolutePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(absolutePath)) fail('Missing backend readiness file', relativePath);
  return readText(absolutePath);
}

function requireJson(relativePath) {
  return JSON.parse(requireFile(relativePath));
}

const requiredFiles = [
  '.env.example',
  'api/session.js',
  'api/license/status.js',
  'api/checkout.js',
  'api/projects/index.js',
  'api/webhooks/stripe.js',
  'assets/js/services/auth-adapter.js',
  'assets/js/services/cloud-save-adapter.js',
  'contracts/cloud-projects-api.contract.json',
  'supabase/schema.sql',
  'docs/AUTH_SUBSCRIPTION_CLOUD_PHASE_17.md',
  'docs/SUPABASE_SCHEMA_PHASE_17.md',
  'docs/STRIPE_SUBSCRIPTION_PHASE_17.md',
];

for (const file of requiredFiles) requireFile(file);

const config = requireFile('assets/js/config/app-config.js');
for (const marker of [
  "version: 'structured-phase-24'",
  "auth: {",
  "cloud: {",
  "session: '/api/session'",
  "licenseStatus: '/api/license/status'",
  "checkout: '/api/checkout'",
  "projects: '/api/projects'",
]) {
  if (!config.includes(marker)) fail('Config missing backend marker', marker);
}

const html = requireFile('index.html');
for (const script of [
  'assets/js/services/auth-adapter.js',
  'assets/js/services/cloud-save-adapter.js',
]) {
  if (!html.includes(script)) fail('index.html does not load backend service', script);
}

const publicApi = requireFile('assets/js/modules/09-public-api.js');
for (const namespace of ['auth', 'cloud']) {
  if (!publicApi.includes("BuildPlan.register('" + namespace + "'")) {
    fail('Missing public backend namespace', namespace);
  }
}

const frontendFiles = [
  'index.html',
  'assets/js/config/app-config.js',
  'assets/js/services/auth-adapter.js',
  'assets/js/services/cloud-save-adapter.js',
  'assets/js/services/license-adapter.js',
];
for (const file of frontendFiles) {
  const content = requireFile(file);
  if (/SERVICE_ROLE|STRIPE_SECRET|WEBHOOK_SECRET/.test(content)) {
    fail('Frontend file must not mention server secret names', file);
  }
}

const schema = requireFile('supabase/schema.sql').toLowerCase();
for (const marker of [
  'create table if not exists public.profiles',
  'create table if not exists public.subscriptions',
  'create table if not exists public.projects',
  'alter table public.projects enable row level security',
  'auth.uid() = user_id',
]) {
  if (!schema.includes(marker)) fail('Supabase schema missing marker', marker);
}

const cloudContract = requireJson('contracts/cloud-projects-api.contract.json');
for (const methodPath of ['GET /api/projects', 'POST /api/projects', 'GET /api/projects/:id']) {
  if (!cloudContract.endpoints?.some((endpoint) => endpoint.method + ' ' + endpoint.path === methodPath)) {
    fail('Cloud project contract missing endpoint', methodPath);
  }
}

const manifest = requireJson('release-manifest.json');
if (!['structured-phase-17', 'structured-phase-18', 'structured-phase-19', 'structured-phase-20', 'structured-phase-24'].includes(manifest.version)) fail('Release manifest phase is not backend ready', manifest.version);
if (manifest.backendReadiness?.latestReport !== 'reports/backend-readiness-phase-17.json') {
  fail('Release manifest missing backend readiness report reference', manifest.backendReadiness);
}
for (const service of ['assets/js/services/auth-adapter.js', 'assets/js/services/cloud-save-adapter.js']) {
  if (!manifest.modules?.services?.includes(service)) fail('Manifest missing backend service', service);
  if (!manifest.modules?.js?.includes(service)) fail('Manifest JS missing backend service', service);
}

const packageJson = requireJson('package.json');
if (packageJson.scripts?.backend !== 'node tools/backend-readiness-preflight.js') {
  fail('package.json missing backend readiness script', packageJson.scripts);
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  files: requiredFiles.length,
  services: 2,
  apiRoutes: 5,
  contracts: 1,
  mode: 'scaffold-ready',
  needsRuntimeSecrets: true,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('backend readiness ok');
console.log('api routes:', report.apiRoutes);
console.log('services:', report.services);
console.log('report:', path.relative(projectDir, reportPath));
