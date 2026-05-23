const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const indexPath = path.join(projectDir, 'index.html');
const manifestPath = path.join(projectDir, 'release-manifest.json');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'production-readiness-phase-13.json');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

const html = readText(indexPath);
const manifest = JSON.parse(readText(manifestPath));
const externalUrls = [...html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/g)].map((match) => match[1]);

const dependencies = externalUrls.map((url) => {
  let name = 'external';
  let action = 'Vendor or pin before commercial release';
  let severity = 'medium';
  if (url.includes('cdn.tailwindcss.com')) {
    name = 'Tailwind CDN';
    action = 'Replace with local compiled Tailwind CSS before production';
    severity = 'high';
  } else if (url.includes('font-awesome')) {
    name = 'Font Awesome';
    action = 'Pin and vendor icon CSS/assets locally';
  } else if (url.includes('fonts.googleapis.com')) {
    name = 'Google Fonts';
    action = 'Self-host Sarabun font files or document external font dependency';
  } else if (url.includes('sweetalert2')) {
    name = 'SweetAlert2';
    action = 'Pin exact package version and vendor local JS asset';
  }
  return { name, url, severity, action };
});

const checks = [
  {
    id: 'external-dependencies',
    ok: dependencies.length === 0,
    severity: dependencies.length ? 'warning' : 'ok',
    message: dependencies.length
      ? 'External CDN dependencies remain. This is acceptable for prototype/local pilot, but not final paid production packaging.'
      : 'No external CDN dependencies found.',
  },
  {
    id: 'local-preview',
    ok: manifest.localPreview?.tool === 'tools/serve-local.js',
    severity: manifest.localPreview?.tool === 'tools/serve-local.js' ? 'ok' : 'warning',
    message: 'Local preview metadata is present.',
  },
  {
    id: 'subscription-contract',
    ok: manifest.subscriptionReadiness?.backendContract === 'contracts/subscription-api.contract.json',
    severity: manifest.subscriptionReadiness?.backendContract ? 'ok' : 'warning',
    message: 'Subscription backend contract metadata is present.',
  },
  {
    id: 'project-schema',
    ok: manifest.dataReadiness?.projectFileSchema === 'contracts/project-file.schema.json',
    severity: manifest.dataReadiness?.projectFileSchema ? 'ok' : 'warning',
    message: 'Project file schema metadata is present.',
  },
];

const report = {
  okForPilot: checks.every((check) => check.ok || check.severity === 'warning'),
  okForPaidProduction: dependencies.length === 0,
  checkedAt: new Date().toISOString(),
  externalDependencyCount: dependencies.length,
  dependencies,
  checks,
  nextActions: [
    'Compile Tailwind to local CSS and remove cdn.tailwindcss.com.',
    'Vendor SweetAlert2 and Font Awesome assets locally or bundle them through a build step.',
    'Self-host Sarabun fonts or keep a documented external font dependency.',
    'Add production build/deploy pipeline after choosing hosting or desktop packaging target.',
  ],
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('production readiness audit ok');
console.log('external dependencies:', dependencies.length);
console.log('ok for pilot:', report.okForPilot);
console.log('ok for paid production:', report.okForPaidProduction);
console.log('report:', path.relative(projectDir, reportPath));
