const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function read(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function fail(label, detail = '') {
  console.error('Function invocation guard preflight failed: ' + label);
  if (detail) console.error(detail);
  process.exit(1);
}

const config = read('assets/js/config/app-config.js');
const appShell = read('assets/js/services/app-shell.js');
const accountUi = read('assets/js/services/account-cloud-ui.js');
const readiness = read('assets/js/services/saas-readiness-adapter.js');
const license = read('assets/js/services/license-adapter.js');
const errorLogger = read('assets/js/services/error-logger.js');
const quality = read('tools/quality-gate.js');
const changelog = read('CHANGELOG.md');

for (const marker of [
  'automaticApiChecks: false',
  'frontendErrorLogging: false',
]) {
  if (!config.includes(marker)) fail('config missing invocation budget marker', marker);
}

for (const marker of [
  'shouldUseAutomaticApiChecks',
  'api-checks-paused',
]) {
  if (!readiness.includes(marker) && !appShell.includes(marker)) fail('automatic readiness guard missing marker', marker);
}

for (const marker of [
  'Automatic license checks are paused',
  'automaticApiChecks',
]) {
  if (!license.includes(marker)) fail('license auto check guard missing marker', marker);
}

if (accountUi.includes('refreshStatus();\n  }')) {
  fail('account cloud UI must not refresh API status during initialization');
}

for (const marker of [
  'frontend-error-logging-disabled',
  'if (!enabled) return',
]) {
  if (!errorLogger.includes(marker)) fail('error logger guard missing marker', marker);
}

if (!quality.includes('function-invocation-guard-preflight.js')) {
  fail('quality gate missing function invocation guard preflight');
}

if (!changelog.includes('phase-69-function-invocation-guard')) {
  fail('changelog missing phase 69 entry');
}

console.log('PASS function-invocation-guard-preflight');
