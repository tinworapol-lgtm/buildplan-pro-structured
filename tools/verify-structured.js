const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const moduleDir = path.join(projectDir, 'assets', 'js', 'modules');
const serviceDir = path.join(projectDir, 'assets', 'js', 'services');

function requireFile(relativePath) {
  const absolutePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error('Missing required file: ' + relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

const expectedModules = [
  '00-buildplan-namespace.js',
  '01-core-state.js',
  '02-storage.js',
  '03-ui-controls-print.js',
  '04-duration-installments.js',
  '05-gantt-rendering.js',
  '06-actual-dashboard.js',
  '07-cost-scurve.js',
  '08-task-editing-bootstrap.js',
  '09-public-api.js',
];
const expectedServices = [
  'license-adapter.js',
  'project-schema.js',
  'auth-adapter.js',
  'cloud-save-adapter.js',
  'saas-readiness-adapter.js',
  'account-cloud-ui.js',
  'app-shell.js',
];
const expectedCssModules = [
  '00-foundation.css',
  '01-gantt.css',
  '02-navigation-cost-dashboard.css',
  '03-plan-duration.css',
  '04-print.css',
  '05-app-shell.css',
];
const requiredRootFiles = [
  'index.html',
  'assets/css/buildplan.css',
  'assets/js/config/app-config.js',
  'contracts/subscription-api.contract.json',
  'contracts/project-file.schema.json',
  'contracts/cloud-projects-api.contract.json',
  'contracts/saas-readiness.contract.json',
  'contracts/auth-otp-api.contract.json',
  'release-manifest.json',
  'CHANGELOG.md',
  'package.json',
  'tools/qa-preflight.js',
  'tools/backend-readiness-preflight.js',
  'tools/saas-activation-preflight.js',
  'tools/saas-readiness-check.js',
  'tools/account-cloud-preflight.js',
  'tools/account-cloud-smoke-preflight.js',
  'tools/browser-account-cloud-smoke.js',
  'tools/production-url-smoke-preflight.js',
  'tools/production-url-smoke.js',
  'tools/vendor-dependency-preflight.js',
  'tools/production-saas-readiness-preflight.js',
  'tools/production-saas-readiness-smoke.js',
  'tools/app-shell-preflight.js',
  'tools/app-shell-smoke.js',
  '.env.example',
  'supabase/schema.sql',
  'api/session.js',
  'api/license/status.js',
  'api/checkout.js',
  'api/projects/index.js',
  'api/webhooks/stripe.js',
  'api/system/readiness.js',
  'api/auth/start.js',
  'api/auth/verify.js',
];

for (const file of requiredRootFiles) requireFile(file);
for (const file of expectedModules) requireFile(path.join('assets', 'js', 'modules', file));
for (const file of expectedServices) requireFile(path.join('assets', 'js', 'services', file));
for (const file of expectedCssModules) requireFile(path.join('assets', 'css', 'modules', file));

const indexHtml = requireFile('index.html');
const expectedJsOrder = [
  'assets/js/config/app-config.js',
  'assets/js/modules/00-buildplan-namespace.js',
  'assets/js/services/license-adapter.js',
  'assets/js/services/project-schema.js',
  'assets/js/services/auth-adapter.js',
  'assets/js/services/cloud-save-adapter.js',
  'assets/js/services/saas-readiness-adapter.js',
  'assets/js/services/account-cloud-ui.js',
  ...expectedModules.slice(1).map((file) => 'assets/js/modules/' + file),
];
let previousIndex = -1;
for (const src of expectedJsOrder) {
  const index = indexHtml.indexOf(src);
  if (index < 0) throw new Error('index.html does not load ' + src);
  if (index <= previousIndex) throw new Error('module load order is incorrect at ' + src);
  previousIndex = index;
}
if (indexHtml.includes('assets/js/app.js')) throw new Error('index.html still loads the monolithic app.js');

const config = requireFile('assets/js/config/app-config.js');
if (!config.includes("version: 'structured-phase-24'")) throw new Error('Config version must be structured-phase-24');
if (!config.includes("session: '/api/session'")) throw new Error('Config missing session endpoint');
if (!config.includes("projects: '/api/projects'")) throw new Error('Config missing cloud projects endpoint');
if (!config.includes("readiness: '/api/system/readiness'")) throw new Error('Config missing SaaS readiness endpoint');
if (!config.includes("startOtp: '/api/auth/start'")) throw new Error('Config missing auth start endpoint');
if (!config.includes("verifyOtp: '/api/auth/verify'")) throw new Error('Config missing auth verify endpoint');

const combined = [
  config,
  requireFile(path.join('assets', 'js', 'modules', '00-buildplan-namespace.js')),
  ...expectedServices.map((file) => requireFile(path.join('assets', 'js', 'services', file))),
  ...expectedModules.slice(1).map((file) => requireFile(path.join('assets', 'js', 'modules', file))),
].join('\n');
new Function('window', combined);

const storageModule = requireFile(path.join('assets', 'js', 'modules', '02-storage.js'));
if (!storageModule.includes('BuildPlanSchema?.prepareForSave')) throw new Error('Storage module is missing schema save hook');
if (!storageModule.includes('BuildPlanSchema?.migrateProjectData')) throw new Error('Storage module is missing schema load hook');

const publicApi = requireFile(path.join('assets', 'js', 'modules', '09-public-api.js'));
for (const namespace of ['config', 'schema', 'license', 'auth', 'cloud', 'saas', 'accountCloud', 'appShell', 'core', 'storage', 'duration', 'gantt', 'actual', 'dashboard', 'cost', 'editing']) {
  if (!publicApi.includes("BuildPlan.register('" + namespace + "'")) {
    throw new Error('Missing public namespace registration: ' + namespace);
  }
}

const stylesheetEntry = requireFile('assets/css/buildplan.css');
for (const cssModule of expectedCssModules) {
  if (!stylesheetEntry.includes('./modules/' + cssModule)) throw new Error('CSS entrypoint does not import: ' + cssModule);
}

const subscriptionContract = JSON.parse(requireFile('contracts/subscription-api.contract.json'));
for (const requiredPath of ['/session', '/license/status', '/checkout', '/webhooks/payment']) {
  if (!subscriptionContract.endpoints?.some((endpoint) => endpoint.path === requiredPath)) {
    throw new Error('Missing subscription contract endpoint: ' + requiredPath);
  }
}
const cloudContract = JSON.parse(requireFile('contracts/cloud-projects-api.contract.json'));
if (!cloudContract.endpoints?.some((endpoint) => endpoint.path === '/api/projects')) throw new Error('Missing cloud projects contract');

const manifest = JSON.parse(requireFile('release-manifest.json'));
if (manifest.version !== 'structured-phase-24') throw new Error('Release manifest must be structured-phase-24');
if (manifest.entrypoint !== 'index.html') throw new Error('Release manifest entrypoint must be index.html');
if (manifest.backendReadiness?.preflight !== 'tools/backend-readiness-preflight.js') throw new Error('Release manifest missing backend readiness preflight');
if (manifest.cloudReadiness?.schema !== 'supabase/schema.sql') throw new Error('Release manifest missing Supabase schema');
if (manifest.saasActivation?.preflight !== 'tools/saas-activation-preflight.js') throw new Error('Release manifest missing SaaS activation preflight');
if (manifest.accountCloud?.preflight !== 'tools/account-cloud-preflight.js') throw new Error('Release manifest missing account/cloud preflight');
if (manifest.accountCloudSmoke?.smoke !== 'tools/browser-account-cloud-smoke.js') throw new Error('Release manifest missing account/cloud smoke tool');
if (manifest.productionUrlSmoke?.smoke !== 'tools/production-url-smoke.js') throw new Error('Release manifest missing production URL smoke tool');
if (manifest.vendorDependencies?.preflight !== 'tools/vendor-dependency-preflight.js') throw new Error('Release manifest missing vendor dependency preflight');
if (manifest.productionSaaSReadiness?.smoke !== 'tools/production-saas-readiness-smoke.js') throw new Error('Release manifest missing production SaaS readiness smoke tool');
if (manifest.appShell?.smoke !== 'tools/app-shell-smoke.js') throw new Error('Release manifest missing app shell smoke tool');

const frontendSecretScan = [
  'index.html',
  'assets/js/config/app-config.js',
  'assets/js/services/auth-adapter.js',
  'assets/js/services/cloud-save-adapter.js',
  'assets/js/services/license-adapter.js',
].map((file) => [file, requireFile(file)]);
for (const [file, content] of frontendSecretScan) {
  if (/SERVICE_ROLE|STRIPE_SECRET|WEBHOOK_SECRET/.test(content)) throw new Error('Frontend file mentions server secret name: ' + file);
}

const packageJson = JSON.parse(requireFile('package.json'));
if (packageJson.scripts?.quality !== 'node tools/quality-gate.js') throw new Error('package.json missing quality script');
if (packageJson.scripts?.backend !== 'node tools/backend-readiness-preflight.js') throw new Error('package.json missing backend script');
if (packageJson.scripts?.['saas:check'] !== 'node tools/saas-readiness-check.js') throw new Error('package.json missing saas:check script');
if (packageJson.scripts?.account !== 'node tools/account-cloud-preflight.js') throw new Error('package.json missing account script');
if (packageJson.scripts?.['smoke:account'] !== 'node tools/browser-account-cloud-smoke.js') throw new Error('package.json missing smoke:account script');
if (packageJson.scripts?.['smoke:prod'] !== 'node tools/production-url-smoke.js') throw new Error('package.json missing smoke:prod script');
if (packageJson.scripts?.vendor !== 'node tools/vendor-dependency-preflight.js') throw new Error('package.json missing vendor script');
if (packageJson.scripts?.['smoke:saas'] !== 'node tools/production-saas-readiness-smoke.js') throw new Error('package.json missing smoke:saas script');
if (packageJson.scripts?.['smoke:shell'] !== 'node tools/app-shell-smoke.js') throw new Error('package.json missing smoke:shell script');

console.log('structured verification ok');
console.log('modules:', expectedModules.length);
console.log('services:', expectedServices.length);
console.log('namespaces:', 16);
console.log('css modules:', expectedCssModules.length);
console.log('contracts:', 5);
console.log('backend tools:', 1);
