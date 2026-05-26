const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const sourceRelative = '.env.beta.example';
const targetRelative = '.env.production.local';
const sourcePath = path.join(projectDir, sourceRelative);
const targetPath = path.join(projectDir, targetRelative);

const args = new Set(process.argv.slice(2));
const writeRequested = args.has('--write');
const force = args.has('--force');

function writeReport(report) {
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'beta-env-template-phase-68.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

const requiredBetaEnv = [
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BETA_ADMIN_TOKEN',
  'BETA_TRIAL_DAYS',
  'BETA_PROJECT_LIMIT',
  'BETA_PROJECT_PAYLOAD_BYTES',
];

const sourceExists = fs.existsSync(sourcePath);
const targetExists = fs.existsSync(targetPath);
let wrote = false;
let skippedReason = '';

if (!sourceExists) {
  skippedReason = `${sourceRelative} is missing`;
} else if (!writeRequested) {
  skippedReason = 'dry run only; pass --write to create .env.production.local';
} else if (targetExists && !force) {
  skippedReason = 'refusing to overwrite .env.production.local; pass --force to replace it';
} else {
  const template = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
  fs.writeFileSync(targetPath, template, 'utf8');
  wrote = true;
}

const report = {
  phase: 'phase-68-beta-env-template',
  checkedAt: new Date().toISOString(),
  source: sourceRelative,
  target: targetRelative,
  sourceExists,
  targetExists,
  writeRequested,
  force,
  wrote,
  skippedReason,
  requiredBetaEnv,
  ok: sourceExists && (!writeRequested || wrote || targetExists),
};

const reportPath = writeReport(report);

console.log(wrote ? `created ${targetRelative}` : `checked ${sourceRelative}`);
if (skippedReason) console.log(skippedReason);
console.log('Stripe is not required for beta.');
console.log('Next:');
console.log('  npm run beta:env:init -- --write');
console.log('  npm run beta:activation-plan');
console.log('  npm run beta:member-preflight');
console.log('  npm run beta:doctor');
console.log('  npm run beta:cloud-smoke');
console.log('report:', path.relative(projectDir, reportPath));

if (!report.ok) process.exitCode = 1;
