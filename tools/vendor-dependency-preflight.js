const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'vendor-dependencies-phase-22.json');

function fail(message, detail) {
  const report = { ok: false, checkedAt: new Date().toISOString(), message, detail };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function readText(relativePath) {
  const filePath = path.join(projectDir, relativePath);
  if (!fs.existsSync(filePath)) fail('Missing vendor dependency file', relativePath);
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const requiredFiles = [
  'assets/vendor/tailwind/tailwindcss-cdn.js',
  'assets/vendor/fontawesome/css/all.min.css',
  'assets/vendor/sweetalert2/sweetalert2.all.min.js',
  'assets/vendor/fonts/sarabun.css',
  'docs/VENDOR_LOCALIZATION_PHASE_22.md',
];
for (const file of requiredFiles) {
  const content = readText(file);
  if (!content.trim()) fail('Vendor dependency file is empty', file);
}

const html = readText('index.html');
for (const external of [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://cdn.jsdelivr.net/npm/sweetalert2',
]) {
  if (html.includes(external)) fail('index.html still references external dependency', external);
}
for (const localAsset of [
  'assets/vendor/tailwind/tailwindcss-cdn.js',
  'assets/vendor/fontawesome/css/all.min.css',
  'assets/vendor/fonts/sarabun.css',
  'assets/vendor/sweetalert2/sweetalert2.all.min.js',
]) {
  if (!html.includes(localAsset)) fail('index.html missing local vendor asset', localAsset);
}

const manifest = readJson('release-manifest.json');
if (!['structured-phase-22', 'structured-phase-24'].includes(manifest.version)) fail('Release manifest phase is not vendor-ready', manifest.version);
if (manifest.vendorDependencies?.latestReport !== 'reports/vendor-dependencies-phase-22.json') {
  fail('Release manifest missing vendor dependency report reference', manifest.vendorDependencies);
}

const packageJson = readJson('package.json');
if (packageJson.scripts?.vendor !== 'node tools/vendor-dependency-preflight.js') {
  fail('package.json missing vendor script', packageJson.scripts);
}

const quality = readText('tools/quality-gate.js');
if (!quality.includes("id: 'vendor-dependencies'")) {
  fail('quality gate missing vendor dependency step', 'tools/quality-gate.js');
}

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  vendorFiles: requiredFiles.length,
  externalReferencesInIndex: 0,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('vendor dependency preflight ok');
console.log('vendor files:', report.vendorFiles);
console.log('report:', path.relative(projectDir, reportPath));
