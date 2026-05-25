const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(label, detail = '') {
  console.error('Supabase RLS grants preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const schema = read('supabase/schema.sql');
const docs = read('docs/SUPABASE_RLS_GRANTS_PHASE_64E_TH.md');
const packageJson = readJson('package.json');
const quality = read('tools/quality-gate.js');

for (const marker of [
  'grant usage on schema public to authenticated',
  'grant select, update on public.profiles to authenticated',
  'grant select on public.subscriptions to authenticated',
  'grant select, insert, update, delete on public.projects to authenticated',
  'grant select, insert on public.feedback to authenticated',
  'grant select on public.audit_logs to authenticated',
  'grant select, insert on public.error_events to authenticated',
  'alter table public.projects enable row level security',
  'projects_select_own',
  'projects_insert_own',
  'projects_update_own',
  'projects_delete_own',
]) {
  if (!schema.toLowerCase().includes(marker)) fail('schema missing marker', marker);
}

for (const marker of ['Data API', 'authenticated', 'RLS', 'supabase/schema.sql']) {
  if (!docs.includes(marker)) fail('docs missing marker', marker);
}

if (packageJson.scripts?.['beta:supabase-preflight'] !== 'node tools/supabase-rls-grants-preflight.js') {
  fail('package.json missing beta:supabase-preflight script', JSON.stringify(packageJson.scripts));
}

if (!quality.includes('supabase-rls-grants-preflight.js')) {
  fail('quality gate missing Supabase RLS grants preflight');
}

console.log('PASS supabase-rls-grants-preflight');
