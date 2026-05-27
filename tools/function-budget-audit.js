const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'function-budget-audit-phase-71.json');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function includesAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

const config = read('assets/js/config/app-config.js');
const appShell = read('assets/js/services/app-shell.js');
const accountUi = read('assets/js/services/account-cloud-ui.js');
const license = read('assets/js/services/license-adapter.js');
const errorLogger = read('assets/js/services/error-logger.js');
const vercel = readJson('vercel.json');

const assetCacheHeader = (vercel.headers || [])
  .find((entry) => entry.source === '/assets/(.*)')
  ?.headers
  ?.find((header) => header.key.toLowerCase() === 'cache-control')
  ?.value || '';

const checks = [
  {
    id: 'automatic-api-checks-disabled',
    ok: config.includes('automaticApiChecks: false'),
    impact: 'Initial app load should not call readiness/session/license APIs.',
  },
  {
    id: 'frontend-error-logging-disabled',
    ok: config.includes('frontendErrorLogging: false') && errorLogger.includes('frontend-error-logging-disabled'),
    impact: 'Browser script errors should not create /api/errors traffic before beta activation.',
  },
  {
    id: 'readiness-check-paused',
    ok: includesAll(appShell, ['shouldUseAutomaticApiChecks', 'api-checks-paused']),
    impact: 'Home page status uses local placeholder instead of calling /api/system/readiness on load.',
  },
  {
    id: 'license-check-paused',
    ok: includesAll(license, ['Automatic license checks are paused', 'automaticApiChecks']),
    impact: 'Planner bootstrap should not call /api/license/status automatically.',
  },
  {
    id: 'account-panel-lazy-refresh',
    ok: includesAll(accountUi, ['Open Account & Cloud to check login', 'if (panel && !panel.classList.contains']),
    impact: 'Account panel calls session/license/readiness only after user opens or acts.',
  },
  {
    id: 'static-first-smoke-available',
    ok: fs.existsSync(path.join(projectDir, 'tools/static-first-no-api-smoke.js')),
    impact: 'Regression test can prove fetch calls are zero during bootstrap.',
  },
  {
    id: 'asset-long-cache',
    ok: /max-age=31536000/.test(assetCacheHeader) && /immutable/.test(assetCacheHeader),
    impact: 'Static assets are cached aggressively because file URLs use version query strings.',
  },
];

const functionEndpoints = [
  '/api/session',
  '/api/license/status',
  '/api/system/readiness',
  '/api/auth/start',
  '/api/auth/verify',
  '/api/projects',
  '/api/feedback',
  '/api/errors',
  '/api/export',
  '/api/checkout',
];

const report = {
  ok: checks.every((check) => check.ok),
  checkedAt: new Date().toISOString(),
  summary: checks.every((check) => check.ok)
    ? 'Initial landing page is protected as static-first. Vercel Function Invocations should occur only from user actions, beta smoke tools, or authenticated cloud workflows.'
    : 'Function budget guard needs attention.',
  assetCacheHeader,
  functionEndpoints,
  checks,
  notes: [
    'Vercel usage warnings are based on accumulated billing-period invocations and may remain visible after fixes.',
    'Run npm run smoke:static-first to prove initial frontend bootstrap has zero fetch calls.',
    'Run npm run ops:function-budget after frontend changes that touch auth, readiness, account cloud, or error logging.',
  ],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

for (const check of checks) {
  console.log(check.ok ? 'PASS' : 'FAIL', check.id);
}
console.log('summary:', report.summary);
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) process.exitCode = 1;
