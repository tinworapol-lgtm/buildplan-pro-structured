const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'saas-launch-doctor-phase-32.json');

function getArg(name, fallback) {
  const prefix = '--' + name + '=';
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function formatGroup(name, status) {
  const ready = status?.readyCount || 0;
  const total = status?.totalCount || 0;
  const missing = Array.isArray(status?.missing) ? status.missing : [];
  return {
    name,
    ready,
    total,
    complete: ready === total,
    missing,
    label: name + ': ' + ready + '/' + total + (missing.length ? ' missing ' + missing.join(', ') : ' ready'),
  };
}

async function main() {
  const manifest = readJson('release-manifest.json');
  const baseUrl = getArg('url', (manifest.webDeploy?.productionUrl || 'https://buildplan-pro-structured.vercel.app/')).replace(/\/$/, '');
  const endpoint = baseUrl + '/api/system/readiness';

  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  const groups = [
    formatGroup('App URL', payload.envStatus?.app),
    formatGroup('Supabase', payload.envStatus?.supabase),
    formatGroup('Stripe', payload.envStatus?.stripe),
  ];
  const missing = Array.isArray(payload.missing) ? payload.missing : groups.flatMap((group) => group.missing);
  const nextActions = Array.isArray(payload.nextActions) ? payload.nextActions : [];

  const report = {
    ok: response.ok,
    checkedAt: new Date().toISOString(),
    endpoint,
    httpStatus: response.status,
    configured: payload.configured === true,
    mode: payload.mode || 'unknown',
    groups,
    missing,
    nextActions,
    commands: {
      openReadiness: endpoint,
      setEnvInVercel: 'vercel env add <ENV_NAME> production',
      deployProduction: 'vercel --prod',
      verifyQuality: 'node tools\\quality-gate.js',
      verifyProduction: 'node tools\\production-url-smoke.js',
    },
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('BuildPlan Pro SaaS Launch Doctor');
  console.log('endpoint:', endpoint);
  console.log('configured:', report.configured);
  console.log('mode:', report.mode);
  for (const group of groups) console.log('-', group.label);
  if (nextActions.length) {
    console.log('next actions:');
    nextActions.forEach((item, index) => console.log(String(index + 1) + '.', item));
  }
  console.log('report:', path.relative(projectDir, reportPath));

  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
