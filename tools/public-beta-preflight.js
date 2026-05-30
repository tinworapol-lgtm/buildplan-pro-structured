const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) {
    return '';
  }
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Public beta preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const schema = read('supabase/schema.sql').toLowerCase();
const config = read('assets/js/config/app-config.js');
const shared = read('api/_shared.js');
const verify = read('api/auth/verify.js');
const session = read('api/session.js');
const license = read('api/license/status.js');
const projects = read('api/projects/index.js');
const cloud = read('assets/js/services/cloud-save-adapter.js');
const accountUi = read('assets/js/services/account-cloud-ui.js');
const feedbackApi = read('api/feedback/index.js');
const adminApi = read('api/admin/beta-summary.js');
const quality = read('tools/quality-gate.js');
const contract = read('contracts/cloud-projects-api.contract.json');

for (const marker of [
  "mode: 'public-beta'",
  "loginRequired: false",
  "publicFreeAccess: true",
  "session: '/api/session'",
  "licenseStatus: '/api/license/status'",
  "projects: '/api/projects'",
  "feedback: '/api/feedback'",
]) {
  if (!config.includes(marker)) fail('config missing public beta marker', marker);
}

for (const marker of [
  'trial_started_at',
  'trial_ends_at',
  'billing_cycle',
  'package_code',
  'create table if not exists public.feedback',
  'create table if not exists public.audit_logs',
  'alter table public.feedback enable row level security',
  'auth.uid() = user_id',
]) {
  if (!schema.includes(marker)) fail('schema missing beta marker', marker);
}

for (const marker of [
  'BETA_TRIAL_DAYS',
  'ensureBetaTrial',
  "status: 'trialing'",
  "package_code: '599'",
  "billing_cycle: 'trial'",
]) {
  if (!shared.includes(marker)) fail('shared helper missing trial marker', marker);
}

for (const [label, source, markers] of [
  ['auth verify ensures beta trial', verify, ['ensureBetaTrial', 'trial']],
  ['session returns subscription', session, ['subscription', 'trialEndsAt', 'daysLeft']],
  ['license returns trialing package 599', license, ['trialing', 'packageCode', 'trialEndsAt']],
  ['projects enforce quota', projects, ['BETA_PROJECT_LIMIT', 'BETA_PROJECT_PAYLOAD_BYTES', 'DELETE', 'archived_at']],
  ['cloud delete adapter', cloud, ['deleteProject', "method: 'DELETE'"]],
  ['account UI feedback and delete actions', accountUi, ['account-cloud-feedback', 'submitFeedback', 'deleteCloudProject']],
  ['feedback API', feedbackApi, ['rating', 'message', 'feature_request', 'project_context']],
  ['admin beta summary API', adminApi, ['totalUsers', 'activeUsers', 'feedback', 'audit']],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) fail(label + ' missing marker', marker);
  }
}

if (!contract.includes('"DELETE"') || !contract.includes('/api/feedback')) {
  fail('contracts missing delete/feedback endpoints');
}

if (!quality.includes('public-beta-preflight.js')) {
  fail('quality gate missing public beta preflight');
}

console.log('PASS public-beta-preflight');
