const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'public-beta-flow-smoke-phase-64.json');

function read(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

const checks = [
  { id: 'session-endpoint', ok: read('assets/js/config/app-config.js').includes('/api/session') },
  { id: 'projects-endpoint', ok: read('assets/js/config/app-config.js').includes('/api/projects') },
  { id: 'export-endpoint', ok: read('api/export/index.js').includes('/api/export') || read('api/export/index.js').includes('buildplan-user-export') },
  { id: 'project-audit-save-load-archive', ok: ['project.save', 'project.load', 'project.archive'].every((marker) => read('api/projects/index.js').includes(marker)) },
  { id: 'feedback-audit', ok: read('api/feedback/index.js').includes('feedback.submit') },
  { id: 'auth-audit', ok: read('api/auth/verify.js').includes('auth.login') },
  { id: 'account-ui-export', ok: read('assets/js/services/account-cloud-ui.js').includes('account-cloud-export') },
];

const report = {
  ok: checks.every((check) => check.ok),
  checkedAt: new Date().toISOString(),
  checks,
  nextLiveSmoke: [
    'Verify OTP login with a Supabase test email.',
    'Save a project to cloud, reload the page, list/load it, then export user data.',
    'Submit feedback and confirm it appears in admin beta summary.',
  ],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

for (const check of checks) console.log(check.ok ? 'PASS' : 'FAIL', check.id);
console.log('report:', path.relative(projectDir, reportPath));
if (!report.ok) process.exitCode = 1;
