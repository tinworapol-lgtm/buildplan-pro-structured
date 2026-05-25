const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const filePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Public beta hardening preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const shared = read('api/_shared.js');
const authVerify = read('api/auth/verify.js');
const projects = read('api/projects/index.js');
const feedback = read('api/feedback/index.js');
const exportApi = read('api/export/index.js');
const cloud = read('assets/js/services/cloud-save-adapter.js');
const accountUi = read('assets/js/services/account-cloud-ui.js');
const contract = read('contracts/cloud-projects-api.contract.json');
const smoke = read('tools/public-beta-flow-smoke.js');
const quality = read('tools/quality-gate.js');

for (const marker of ['writeAuditLog', 'audit_logs', 'action', 'metadata']) {
  if (!shared.includes(marker)) fail('shared audit helper missing marker', marker);
}

for (const [label, source, markers] of [
  ['auth verify audit', authVerify, ['writeAuditLog', 'auth.login']],
  ['project save/load/archive audit', projects, ['writeAuditLog', 'project.save', 'project.load', 'project.archive']],
  ['feedback audit', feedback, ['writeAuditLog', 'feedback.submit']],
  ['export API', exportApi, ['GET', 'projects', 'feedback', 'subscriptions', 'buildplan-user-export']],
  ['cloud export adapter', cloud, ['exportUserData', '/api/export']],
  ['account UI export button', accountUi, ['account-cloud-export', 'exportUserData']],
  ['contract export endpoint', contract, ['"/api/export"', '"purpose": "Export beta user data"']],
  ['public beta smoke tool', smoke, ['public-beta-flow-smoke', '/api/session', '/api/projects', '/api/export']],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) fail(label + ' missing marker', marker);
  }
}

if (!quality.includes('public-beta-hardening-preflight.js')) {
  fail('quality gate missing public beta hardening preflight');
}

console.log('PASS public-beta-hardening-preflight');
