const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'production-url-smoke-phase-38.json');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function getProductionUrl() {
  const manifest = readJson('release-manifest.json');
  return (process.env.BUILDPLAN_PRODUCTION_URL || manifest.webDeploy?.productionUrl || '').trim();
}

async function main() {
  const url = getProductionUrl();
  if (!url) throw new Error('Missing production URL');

  const response = await fetch(url, { headers: { Accept: 'text/html' } });
  const html = await response.text();
  const baseUrl = url.replace(/\/$/, '');

  const configResponse = await fetch(baseUrl + '/assets/js/config/app-config.js?v=phase31', {
    headers: { Accept: 'application/javascript' },
  });
  const configJs = await configResponse.text();

  const appShellResponse = await fetch(baseUrl + '/assets/js/services/app-shell.js?v=phase42', {
    headers: { Accept: 'application/javascript' },
  });
  const appShellJs = await appShellResponse.text();

  const ctMockResponse = await fetch(baseUrl + '/assets/js/services/ct-saas-mock-app.js?v=phase41', {
    headers: { Accept: 'application/javascript' },
  });
  const ctMockJs = await ctMockResponse.text();

  const checks = [
    { id: 'http-200', ok: response.status === 200, detail: String(response.status) },
    { id: 'has-account-cloud-button', ok: html.includes('btn-account-cloud'), detail: 'btn-account-cloud' },
    { id: 'loads-account-cloud-ui', ok: html.includes('account-cloud-ui.js'), detail: 'account-cloud-ui.js' },
    { id: 'config-http-200', ok: configResponse.status === 200, detail: String(configResponse.status) },
    { id: 'has-phase-marker', ok: configJs.includes('structured-phase-24'), detail: 'structured-phase-24' },
    { id: 'public-free-access-config', ok: configJs.includes('publicFreeAccess: true') && configJs.includes('loginRequired: false'), detail: 'public free access' },
    { id: 'has-saas-readiness-adapter', ok: html.includes('saas-readiness-adapter.js'), detail: 'saas-readiness-adapter.js' },
    { id: 'has-app-home-page', ok: html.includes('id="app-home-page"'), detail: 'app-home-page' },
    { id: 'has-workspace-back-home', ok: html.includes('id="btn-workspace-back-home"') && html.includes('workspace-back-home-btn'), detail: 'workspace back home button' },
    { id: 'has-app-login-page', ok: html.includes('id="app-login-page"'), detail: 'app-login-page' },
    { id: 'has-ct-saas-landing', ok: html.includes('BuildPlan Pro') && html.includes('btn-hero-signup'), detail: 'BuildPlan Pro landing copy' },
        { id: 'has-public-free-support-landing', ok: html.includes('ct-reference-landing') && html.includes('ct-free-access-row') && html.includes('id="ct-support-modal"') && !html.includes('ct-plan-price-row'), detail: 'public free access landing with supporter modal' },
    { id: 'has-ct-program-selector', ok: html.includes('id="ct-program-selector"'), detail: 'ct-program-selector' },
    { id: 'has-ct-user-dashboard', ok: html.includes('id="ct-user-dashboard"'), detail: 'ct-user-dashboard' },
    { id: 'has-reference-user-dashboard', ok: html.includes('ct-dashboard-ref-page') && html.includes('ct-ref-quick-actions') && html.includes('data-ct-plan-storage'), detail: 'phase 43 user dashboard reference UI' },
    { id: 'has-ct-admin-dashboard', ok: html.includes('id="ct-admin-dashboard"'), detail: 'ct-admin-dashboard' },
    { id: 'has-ct-help-chatbot', ok: html.includes('id="ct-help-chatbot"'), detail: 'ct-help-chatbot' },
    { id: 'has-ct-subscription-panel', ok: html.includes('id="ct-subscription-panel"') && html.includes('data-ct-subscription-scenario'), detail: 'ct-subscription-panel' },
    { id: 'has-ct-billing-modal', ok: html.includes('id="ct-billing-modal"') && html.includes('data-ct-choose-plan'), detail: 'ct-billing-modal' },
    { id: 'loads-ct-saas-mock-app', ok: html.includes('assets/js/services/ct-saas-mock-app.js?v=phase41'), detail: 'ct-saas-mock-app.js?v=phase41' },
    { id: 'loads-app-shell', ok: html.includes('assets/js/services/app-shell.js?v=phase42'), detail: 'assets/js/services/app-shell.js?v=phase42' },
    { id: 'app-shell-http-200', ok: appShellResponse.status === 200, detail: String(appShellResponse.status) },
    { id: 'app-shell-has-visibility-router', ok: appShellJs.includes('applyRouteVisibility') && appShellJs.includes('workspaceElementIds'), detail: 'applyRouteVisibility' },
    { id: 'app-shell-has-ct-routes', ok: appShellJs.includes("'programs'") && appShellJs.includes("'user-dashboard'") && appShellJs.includes("'admin-dashboard'"), detail: 'ct routes' },
    { id: 'app-shell-has-billing-route', ok: appShellJs.includes("'billing'") && appShellJs.includes('ct-billing-modal'), detail: 'billing route' },
    { id: 'ct-mock-app-http-200', ok: ctMockResponse.status === 200, detail: String(ctMockResponse.status) },
    { id: 'ct-mock-app-public-unlock', ok: ctMockJs.includes('if (publicFreeAccess) return true') && ctMockJs.includes("const unlockedPlan = publicFreeAccess ? '599' : null"), detail: 'public free feature unlock' },
        { id: 'ct-mock-app-has-billing-modal', ok: ctMockJs.includes('openBilling') && ctMockJs.includes('choosePlan'), detail: 'billing modal' },
    { id: 'ct-mock-app-has-support-modal', ok: ctMockJs.includes('openSupport') && ctMockJs.includes('chooseSupportTier'), detail: 'supporter modal' },
    { id: 'ct-mock-app-has-support-checkout', ok: ctMockJs.includes('/api/support') && ctMockJs.includes('payload.checkoutUrl'), detail: 'support checkout api' },
    { id: 'ct-mock-app-has-support-status', ok: html.includes('data-ct-support-status') && ctMockJs.includes('handleSupportReturn') && ctMockJs.includes('refreshSupportStatus'), detail: 'support status ui' },
    { id: 'uses-local-tailwind', ok: html.includes('assets/vendor/tailwind/tailwindcss-cdn.js'), detail: 'assets/vendor/tailwind/tailwindcss-cdn.js' },
    { id: 'uses-local-fontawesome', ok: html.includes('assets/vendor/fontawesome/css/all.min.css'), detail: 'assets/vendor/fontawesome/css/all.min.css' },
    { id: 'uses-local-sweetalert2', ok: html.includes('assets/vendor/sweetalert2/sweetalert2.all.min.js'), detail: 'assets/vendor/sweetalert2/sweetalert2.all.min.js' },
    { id: 'no-external-cdn', ok: !/(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|cdn\.jsdelivr\.net\/npm\/sweetalert2)/.test(html), detail: 'external CDN references' },
  ];

  const report = {
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    url,
    status: response.status,
    checks,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  for (const check of checks) console.log(check.ok ? 'PASS' : 'FAIL', check.id);
  console.log('report:', path.relative(projectDir, reportPath));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    url: getProductionUrl(),
    error: error.message,
  };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.error(error.message);
  console.log('report:', path.relative(projectDir, reportPath));
  process.exitCode = 1;
});
