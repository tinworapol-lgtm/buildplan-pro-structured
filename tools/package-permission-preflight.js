const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const mockApp = fs.readFileSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js'), 'utf8');
const qualityGate = fs.readFileSync(path.join(projectDir, 'tools/quality-gate.js'), 'utf8');

const requiredSnippets = [
  {
    label: 'workspace feature rule map',
    source: mockApp,
    pattern: /workspaceFeatureRules|FEATURE_MIN_PLAN|featureMinPlan/,
  },
  {
    label: 'workspace feature permission checker',
    source: mockApp,
    pattern: /isFeatureAllowedForPlan|isWorkspaceFeatureAllowed/,
  },
  {
    label: 'public free access unlocks all workspace features',
    source: mockApp,
    pattern: /publicFreeAccess[\s\S]*return true/,
  },
  {
    label: 'public free access forces package 599',
    source: mockApp,
    pattern: /unlockedPlan[\s\S]*599/,
  },
  {
    label: 'workspace feature lock renderer',
    source: mockApp,
    pattern: /applyWorkspaceFeatureLocks/,
  },
  {
    label: 'upgrade alert for locked package features',
    source: mockApp,
    pattern: /showPackageUpgradeAlert/,
  },
  {
    label: 'capture-phase locked feature guard',
    source: mockApp,
    pattern: /addEventListener\('click'[\s\S]*data-plan-feature[\s\S]*true\)/,
  },
  {
    label: 'dashboard button is package-gated',
    source: html,
    pattern: /id="btn-page-dashboard"[^>]*data-plan-feature="dashboard"/,
  },
  {
    label: 'actual progress button is package-gated',
    source: html,
    pattern: /id="btn-page-actual"[^>]*data-plan-feature="actual-progress"/,
  },
  {
    label: 'cost button is package-gated',
    source: html,
    pattern: /id="btn-page-cost"[^>]*data-plan-feature="cost-scurve"/,
  },
  {
    label: 'duration button is package-gated',
    source: html,
    pattern: /id="btn-page-duration"[^>]*data-plan-feature="duration-planning"/,
  },
  {
    label: 'quality gate includes package permission preflight',
    source: qualityGate,
    pattern: /package-permission-preflight\.js/,
  },
];

const failures = requiredSnippets
  .filter((check) => !check.pattern.test(check.source))
  .map((check) => check.label);

if (failures.length) {
  console.error('Package permission preflight failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('PASS package-permission-preflight');
