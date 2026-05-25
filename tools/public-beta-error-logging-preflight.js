const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Public beta error logging preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const schema = read('supabase/schema.sql').toLowerCase();
const errorApi = read('api/errors/index.js');
const errorLogger = read('assets/js/services/error-logger.js');
const html = read('index.html');
const adminApi = read('api/admin/beta-summary.js');
const contract = read('contracts/cloud-projects-api.contract.json');
const quality = read('tools/quality-gate.js');
const smoke = read('tools/public-beta-flow-smoke.js');

for (const marker of [
  'create table if not exists public.error_events',
  'alter table public.error_events enable row level security',
  'error_events_user_id_created_at_idx',
]) {
  if (!schema.includes(marker)) fail('schema missing error event marker', marker);
}

for (const marker of ['message', 'source', 'stack', 'route', 'user_agent', 'writeAuditLog', 'error.report']) {
  if (!errorApi.includes(marker)) fail('error API missing marker', marker);
}

for (const marker of ['window.addEventListener(\'error\'', 'unhandledrejection', '/api/errors', 'BuildPlanErrorLogger']) {
  if (!errorLogger.includes(marker)) fail('frontend error logger missing marker', marker);
}

if (!html.includes('assets/js/services/error-logger.js')) fail('index.html does not load error logger');
if (!adminApi.includes('error_events') || !adminApi.includes('errors')) fail('admin summary missing error events');
if (!contract.includes('/api/errors')) fail('contract missing errors endpoint');
if (!quality.includes('public-beta-error-logging-preflight.js')) fail('quality gate missing error logging preflight');
if (!smoke.includes('error-logger') || !smoke.includes('/api/errors')) fail('public beta smoke missing error logging checks');

console.log('PASS public-beta-error-logging-preflight');
