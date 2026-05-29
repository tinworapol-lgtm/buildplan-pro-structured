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
  console.error('Member signup preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const schema = read('supabase/schema.sql');
const shared = read('api/_shared.js');
const authStart = read('api/auth/start.js');
const authVerify = read('api/auth/verify.js');
const sessionApi = read('api/session.js');
const profileApi = read('api/profile.js');
const adminApi = read('api/admin/beta-summary.js');
const html = read('index.html');
const appShell = read('assets/js/services/app-shell.js');
const authAdapter = read('assets/js/services/auth-adapter.js');
const quality = read('tools/quality-gate.js');
const packageJson = readJson('package.json');
const docs = read('docs/MEMBER_SIGNUP_PHASE_65_TH.md');
const vercel = read('vercel.json');

for (const marker of [
  'full_name text',
  'phone text',
  'organization text',
  'role text',
  "member_status text not null default 'beta'",
  'beta_source text',
  'last_seen_at timestamptz',
  'alter table public.profiles add column if not exists full_name text',
  'grant select, update on public.profiles to authenticated',
  'profiles_update_own',
]) {
  if (!schema.toLowerCase().includes(marker)) fail('schema missing member marker', marker);
}

for (const marker of ['normalizeMemberProfile', 'upsertMemberProfile', 'getMemberProfile', 'last_seen_at']) {
  if (!shared.includes(marker)) fail('shared helper missing marker', marker);
}

for (const marker of ['memberProfile', 'normalizeMemberProfile', 'signupMode', 'APP_BASE_URL', 'email_redirect_to']) {
  if (!authStart.includes(marker)) fail('auth start missing marker', marker);
}

for (const marker of ['memberProfile', 'upsertMemberProfile', 'ensureBetaTrial']) {
  if (!authVerify.includes(marker)) fail('auth verify missing marker', marker);
}

for (const marker of ['memberProfile', 'getMemberProfile']) {
  if (!sessionApi.includes(marker)) fail('session API missing marker', marker);
}

if (profileApi) fail('api/profile.js must not exist on Vercel Hobby plan; use /api/session via rewrite');

for (const marker of ['PATCH', 'upsertMemberProfile', 'memberProfile']) {
  if (!sessionApi.includes(marker)) fail('session profile PATCH missing marker', marker);
}

for (const marker of ['"/api/profile"', '"/api/session"']) {
  if (!vercel.includes(marker)) fail('vercel rewrite missing profile marker', marker);
}

for (const marker of ['totalMembers', 'membersToday', 'membersThisWeek', 'latestMembers', 'full_name', 'organization']) {
  if (!adminApi.includes(marker)) fail('admin summary missing member marker', marker);
}

for (const marker of ['btn-home-signup', 'signup-full-name', 'signup-phone', 'signup-organization', 'signup-role', 'signup-otp-code']) {
  if (!html.includes(marker)) fail('HTML missing signup marker', marker);
}

for (const marker of ['openSignup', 'submitSignupProfile', 'verifySignupCode', 'ระบบสมาชิกยังไม่เปิดใช้งาน']) {
  if (!appShell.includes(marker)) fail('app shell missing signup marker', marker);
}

for (const marker of ['memberProfile', 'requestEmailOtp(email, memberProfile', 'verifyEmailOtp(email, token, memberProfile']) {
  if (!authAdapter.includes(marker)) fail('auth adapter missing signup marker', marker);
}

if (packageJson.scripts?.['beta:member-preflight'] !== 'node tools/member-signup-preflight.js') {
  fail('package.json missing beta:member-preflight script', JSON.stringify(packageJson.scripts));
}

if (!quality.includes('member-signup-preflight.js')) fail('quality gate missing member signup preflight');

for (const marker of ['สมัครสมาชิกฟรี', 'profiles', 'memberProfile', 'Email OTP']) {
  if (!docs.includes(marker)) fail('docs missing marker', marker);
}

console.log('PASS member-signup-preflight');
