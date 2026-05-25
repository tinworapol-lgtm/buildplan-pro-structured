const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'live-beta-cloud-flow-phase-64D.json');

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

function noSecretLeak(text) {
  const value = String(text || '');
  return ![
    /sk_(live|test)_[A-Za-z0-9]+/,
    /whsec_[A-Za-z0-9]+/,
    /sbp_[A-Za-z0-9]+/,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  ].some((pattern) => pattern.test(value));
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

async function api(endpoint, options = {}) {
  const token = process.env.BETA_LIVE_ACCESS_TOKEN || '';
  const headers = {
    accept: 'application/json',
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: 'Bearer ' + token } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(getProductionUrl() + endpoint, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = { raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    status: response.status,
    payload,
    noSecretLeak: noSecretLeak(text),
  };
}

async function runStep(id, fn) {
  const startedAt = new Date().toISOString();
  try {
    const result = await fn();
    return {
      id,
      status: result.ok && result.noSecretLeak !== false ? 'passed' : 'failed',
      httpStatus: result.status,
      noSecretLeak: result.noSecretLeak !== false,
      summary: summarizeJson(result.payload),
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id,
      status: 'failed',
      error: error.message,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

async function main() {
  const token = process.env.BETA_LIVE_ACCESS_TOKEN || '';
  if (!token) {
    const report = {
      phase: 'phase-64D-live-beta-cloud-flow',
      productionUrl: getProductionUrl(),
      checkedAt: new Date().toISOString(),
      ok: true,
      skipped: true,
      reason: 'BETA_LIVE_ACCESS_TOKEN is required to run the live beta cloud flow smoke.',
      notes: [
        'This tool exercises project.save, project.load, and project.archive against /api/projects.',
        'It is skipped without a token so quality gate can run without secrets.',
        'no-secret-leak checks scan response bodies for common service-token patterns.',
      ],
    };
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('SKIP live-beta-cloud-flow BETA_LIVE_ACCESS_TOKEN required');
    console.log('report:', path.relative(projectDir, reportPath));
    return;
  }

  const smokeName = 'BuildPlan Pro Beta Smoke ' + new Date().toISOString();
  let createdProjectId = '';

  const results = [];
  results.push(await runStep('session', () => api('/api/session')));
  results.push(await runStep('license-status', () => api('/api/license/status')));
  results.push(await runStep('project.list.before', () => api('/api/projects')));
  results.push(await runStep('project.save', async () => {
    const result = await api('/api/projects', {
      method: 'POST',
      body: {
        name: smokeName,
        projectData: {
          schemaVersion: 1,
          projectInfo: {
            name: smokeName,
            contractNo: 'BETA-SMOKE',
          },
          tasks: [],
          source: 'tools/live-beta-cloud-flow-smoke.js',
        },
      },
    });
    createdProjectId = result.payload?.project?.id || '';
    return result;
  }));
  results.push(await runStep('project.load', () => {
    if (!createdProjectId) throw new Error('Missing created project id');
    return api('/api/projects?id=' + encodeURIComponent(createdProjectId));
  }));
  results.push(await runStep('project.archive', () => {
    if (!createdProjectId) throw new Error('Missing created project id');
    return api('/api/projects?id=' + encodeURIComponent(createdProjectId), { method: 'DELETE' });
  }));
  results.push(await runStep('project.list.after', () => api('/api/projects')));

  const failed = results.filter((result) => result.status !== 'passed');
  const report = {
    phase: 'phase-64D-live-beta-cloud-flow',
    productionUrl: getProductionUrl(),
    checkedAt: new Date().toISOString(),
    ok: failed.length === 0,
    skipped: false,
    createdProjectId,
    auditExpectations: ['project.save', 'project.load', 'project.archive'],
    noSecretLeak: results.every((result) => result.noSecretLeak !== false),
    securityCheck: 'no-secret-leak',
    results,
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  for (const result of results) {
    console.log(result.status === 'passed' ? 'PASS' : 'FAIL', result.id, result.httpStatus ? `HTTP ${result.httpStatus}` : result.error || '');
  }
  console.log('report:', path.relative(projectDir, reportPath));

  if (!report.ok) process.exitCode = 1;
}

main();
