const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'quality-gate-phase-14.json');

const steps = [
  {
    id: 'production-audit',
    command: process.execPath,
    args: ['tools/audit-production-readiness.js'],
    required: true,
  },
  {
    id: 'structured-verify',
    command: process.execPath,
    args: ['tools/verify-structured.js'],
    required: true,
  },
  {
    id: 'qa-preflight',
    command: process.execPath,
    args: ['tools/qa-preflight.js'],
    required: true,
  },
  {
    id: 'backend-readiness',
    command: process.execPath,
    args: ['tools/backend-readiness-preflight.js'],
    required: true,
  },
  {
    id: 'saas-activation',
    command: process.execPath,
    args: ['tools/saas-activation-preflight.js'],
    required: true,
  },
  {
    id: 'saas-readiness',
    command: process.execPath,
    args: ['tools/saas-readiness-check.js'],
    required: true,
  },
  {
    id: 'account-cloud',
    command: process.execPath,
    args: ['tools/account-cloud-preflight.js'],
    required: true,
  },
  {
    id: 'account-cloud-smoke-preflight',
    command: process.execPath,
    args: ['tools/account-cloud-smoke-preflight.js'],
    required: true,
  },
  {
    id: 'account-cloud-smoke',
    command: process.execPath,
    args: ['tools/browser-account-cloud-smoke.js'],
    required: true,
  },
  {
    id: 'production-url-smoke-preflight',
    command: process.execPath,
    args: ['tools/production-url-smoke-preflight.js'],
    required: true,
  },
  {
    id: 'vendor-dependencies',
    command: process.execPath,
    args: ['tools/vendor-dependency-preflight.js'],
    required: true,
  },
  {
    id: 'production-saas-readiness-preflight',
    command: process.execPath,
    args: ['tools/production-saas-readiness-preflight.js'],
    required: true,
  },
  {
    id: 'app-shell',
    command: process.execPath,
    args: ['tools/app-shell-preflight.js'],
    required: true,
  },
  {
    id: 'app-shell-smoke',
    command: process.execPath,
    args: ['tools/app-shell-smoke.js'],
    required: true,
  },
  {
    id: 'phase-regression',
    command: process.execPath,
    args: ['tools/phase-regression-preflight.js'],
    required: true,
  },
  {
    id: 'package-permission',
    command: process.execPath,
    args: ['tools/package-permission-preflight.js'],
    required: true,
  },
  {
    id: 'subscription-packages',
    command: process.execPath,
    args: ['tools/subscription-packages-preflight.js'],
    required: true,
  },
  {
    id: 'public-beta',
    command: process.execPath,
    args: ['tools/public-beta-preflight.js'],
    required: true,
  },
  {
    id: 'public-beta-hardening',
    command: process.execPath,
    args: ['tools/public-beta-hardening-preflight.js'],
    required: true,
  },
  {
    id: 'public-beta-flow-smoke',
    command: process.execPath,
    args: ['tools/public-beta-flow-smoke.js'],
    required: true,
  },
  {
    id: 'public-beta-error-logging',
    command: process.execPath,
    args: ['tools/public-beta-error-logging-preflight.js'],
    required: true,
  },
  {
    id: 'live-beta-readiness',
    command: process.execPath,
    args: ['tools/live-beta-readiness-preflight.js'],
    required: true,
  },
  {
    id: 'live-beta-cloud-flow',
    command: process.execPath,
    args: ['tools/live-beta-cloud-flow-preflight.js'],
    required: true,
  },
  {
    id: 'supabase-rls-grants',
    command: process.execPath,
    args: ['tools/supabase-rls-grants-preflight.js'],
    required: true,
  },
  {
    id: 'member-signup',
    command: process.execPath,
    args: ['tools/member-signup-preflight.js'],
    required: true,
  },
  {
    id: 'member-signup-smoke-preflight',
    command: process.execPath,
    args: ['tools/member-signup-smoke-preflight.js'],
    required: true,
  },
  {
    id: 'member-signup-smoke',
    command: process.execPath,
    args: ['tools/member-signup-smoke.js'],
    required: true,
  },
  {
    id: 'support-payments',
    command: process.execPath,
    args: ['tools/support-payments-preflight.js'],
    required: true,
  },
  {
    id: 'beta-activation',
    command: process.execPath,
    args: ['tools/beta-activation-preflight.js'],
    required: true,
  },
  {
    id: 'beta-env-template',
    command: process.execPath,
    args: ['tools/beta-env-template-preflight.js'],
    required: true,
  },
  {
    id: 'function-invocation-guard',
    command: process.execPath,
    args: ['tools/function-invocation-guard-preflight.js'],
    required: true,
  },
  {
    id: 'static-first-no-api-smoke',
    command: process.execPath,
    args: ['tools/static-first-no-api-smoke.js'],
    required: true,
  },
  {
    id: 'function-budget-audit-preflight',
    command: process.execPath,
    args: ['tools/function-budget-audit-preflight.js'],
    required: true,
  },
  {
    id: 'function-budget-audit',
    command: process.execPath,
    args: ['tools/function-budget-audit.js'],
    required: true,
  },
  {
    id: 'supabase-beta-activation',
    command: process.execPath,
    args: ['tools/supabase-beta-activation-preflight.js'],
    required: true,
  },
  {
    id: 'public-beta-readiness',
    command: process.execPath,
    args: ['tools/public-beta-readiness-preflight.js'],
    required: true,
  },
];

function runStep(step) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(step.command, step.args, {
    cwd: projectDir,
    encoding: 'utf8',
    shell: false,
  });
  const completedAt = new Date().toISOString();
  const output = ((result.stdout || '') + (result.stderr || '')).trim();
  return {
    id: step.id,
    command: [step.command, ...step.args].join(' '),
    required: step.required,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    startedAt,
    completedAt,
    output,
  };
}

const results = steps.map(runStep);
const failed = results.filter((step) => step.required && step.status !== 'passed');
const auditReportPath = path.join(projectDir, 'reports', 'production-readiness-phase-13.json');
let paidProductionReady = false;
let pilotReady = false;
if (fs.existsSync(auditReportPath)) {
  const audit = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));
  paidProductionReady = !!audit.okForPaidProduction;
  pilotReady = !!audit.okForPilot;
}

const report = {
  ok: failed.length === 0,
  pilotReady,
  paidProductionReady,
  checkedAt: new Date().toISOString(),
  steps: results,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

for (const step of results) {
  console.log(step.status === 'passed' ? 'PASS' : 'FAIL', step.id);
}
console.log('pilot ready:', pilotReady);
console.log('paid production ready:', paidProductionReady);
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) {
  process.exitCode = 1;
}
