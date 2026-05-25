const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'live-beta-readiness-phase-64C.json');

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const writeErrorTest = args.has('--write-error-test');

function readJson(relativePath) {
  const file = path.join(projectDir, relativePath);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getProductionUrl() {
  const manifest = readJson('release-manifest.json');
  const configured = process.env.BUILDPLAN_PRODUCTION_URL
    || process.env.APP_BASE_URL
    || manifest?.webDeploy?.productionUrl
    || 'https://buildplan-pro-structured.vercel.app/';
  return configured.replace(/\/+$/, '');
}

function redact(value) {
  if (!value) return '';
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/g, 'Bearer [redacted]')
    .replace(/(BETA_LIVE_ACCESS_TOKEN=)[^\s]+/g, '$1[redacted]')
    .replace(/(BETA_ADMIN_TOKEN=)[^\s]+/g, '$1[redacted]');
}

function noSecretLeak(text) {
  const value = String(text || '');
  const patterns = [
    /sk_(live|test)_[A-Za-z0-9]+/,
    /whsec_[A-Za-z0-9]+/,
    /sbp_[A-Za-z0-9]+/,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  ];
  return !patterns.some((pattern) => pattern.test(value));
}

async function requestCheck(check) {
  const token = process.env.BETA_LIVE_ACCESS_TOKEN || '';
  const adminToken = process.env.BETA_ADMIN_TOKEN || '';

  if (check.requiresAuth && !token) {
    return {
      id: check.id,
      endpoint: check.endpoint,
      status: 'skipped',
      reason: 'BETA_LIVE_ACCESS_TOKEN required for authenticated live check',
    };
  }

  if (check.requiresAdmin && !adminToken) {
    return {
      id: check.id,
      endpoint: check.endpoint,
      status: 'skipped',
      reason: 'BETA_ADMIN_TOKEN required for admin live check',
    };
  }

  if (check.requiresWriteFlag && !writeErrorTest) {
    return {
      id: check.id,
      endpoint: check.endpoint,
      status: 'skipped',
      reason: 'write check disabled; pass --write-error-test to exercise this endpoint',
    };
  }

  const headers = {
    accept: 'application/json',
  };
  if (check.requiresAuth) headers.authorization = `Bearer ${token}`;
  if (check.requiresAdmin) headers['x-admin-token'] = adminToken;
  if (check.method === 'POST') headers['content-type'] = 'application/json';

  const url = getProductionUrl() + check.endpoint;
  const startedAt = new Date().toISOString();
  const response = await fetch(url, {
    method: check.method || 'GET',
    headers,
    body: check.body ? JSON.stringify(check.body) : undefined,
  });
  const text = await response.text();
  const leakedSecret = !noSecretLeak(text);
  const okStatus = check.okStatuses.includes(response.status);

  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_) {
    parsed = null;
  }

  const readinessConfigured = check.id === 'system-readiness' && parsed && typeof parsed.configured === 'boolean'
    ? parsed.configured
    : undefined;
  const strictReadinessOk = check.id !== 'system-readiness' || !strict || readinessConfigured === true;

  return {
    id: check.id,
    endpoint: check.endpoint,
    method: check.method || 'GET',
    status: okStatus && !leakedSecret && strictReadinessOk ? 'passed' : 'failed',
    httpStatus: response.status,
    startedAt,
    completedAt: new Date().toISOString(),
    noSecretLeak: !leakedSecret,
    readinessConfigured,
    summary: parsed ? summarizeJson(parsed) : redact(text).slice(0, 500),
  };
}

function summarizeJson(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? { count: value.length } : {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|key|password/i.test(key)) {
      copy[key] = '[redacted]';
    } else if (Array.isArray(item)) {
      copy[key] = { count: item.length };
    } else if (item && typeof item === 'object') {
      copy[key] = summarizeJson(item);
    } else {
      copy[key] = item;
    }
  }
  return copy;
}

async function main() {
  const checks = [
    {
      id: 'system-readiness',
      endpoint: '/api/system/readiness',
      okStatuses: [200],
    },
    {
      id: 'session',
      endpoint: '/api/session',
      requiresAuth: true,
      okStatuses: [200],
    },
    {
      id: 'license-status',
      endpoint: '/api/license/status',
      requiresAuth: true,
      okStatuses: [200],
    },
    {
      id: 'projects-list',
      endpoint: '/api/projects',
      requiresAuth: true,
      okStatuses: [200],
    },
    {
      id: 'feedback-list',
      endpoint: '/api/feedback',
      requiresAuth: true,
      okStatuses: [200],
    },
    {
      id: 'export',
      endpoint: '/api/export',
      requiresAuth: true,
      okStatuses: [200],
    },
    {
      id: 'error-logging',
      endpoint: '/api/errors',
      method: 'POST',
      requiresWriteFlag: true,
      okStatuses: [200, 201, 204],
      body: {
        message: 'live beta readiness write probe',
        source: 'tools/live-beta-readiness-doctor.js',
      },
    },
    {
      id: 'admin-beta-summary',
      endpoint: '/api/admin/beta-summary',
      requiresAdmin: true,
      okStatuses: [200],
    },
  ];

  const results = [];
  for (const check of checks) {
    try {
      results.push(await requestCheck(check));
    } catch (error) {
      results.push({
        id: check.id,
        endpoint: check.endpoint,
        status: 'failed',
        error: redact(error.message),
      });
    }
  }

  const failed = results.filter((result) => result.status === 'failed');
  const skipped = results.filter((result) => result.status === 'skipped');
  const strictFailures = strict ? [...failed, ...skipped] : failed;
  const report = {
    phase: 'phase-64C-live-beta-readiness',
    mode: strict ? 'strict' : 'standard',
    productionUrl: getProductionUrl(),
    checkedAt: new Date().toISOString(),
    ok: strictFailures.length === 0,
    strict,
    writeErrorTest,
    results,
    notes: [
      'no-secret-leak checks scan response bodies for common service-token patterns.',
      'Authenticated checks require BETA_LIVE_ACCESS_TOKEN.',
      'Admin checks require BETA_ADMIN_TOKEN.',
    ],
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  for (const result of results) {
    const label = result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIP' : 'FAIL';
    console.log(label, result.id, result.httpStatus ? `HTTP ${result.httpStatus}` : result.reason || result.error || '');
  }
  console.log('report:', path.relative(projectDir, reportPath));

  if (!report.ok) process.exitCode = 1;
}

main();
