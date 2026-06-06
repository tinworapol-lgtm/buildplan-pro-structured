const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'app-shell-smoke-phase-37.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function createElement(id) {
  const listeners = {};
  return {
    id,
    value: '',
    textContent: '',
    dataset: {},
    style: {},
    listeners,
    addEventListener: (eventName, handler) => { listeners[eventName] = handler; },
  };
}

const ids = [
  'app-home-page',
  'app-login-page',
  'ct-program-selector',
  'ct-user-dashboard',
  'ct-admin-dashboard',
  'ct-help-chatbot',
  'top-ribbon',
  'project-info-header',
  'gantt-page',
  'signature-section',
  'btn-home-open-workspace',
  'btn-workspace-back-home',
  'btn-home-login',
  'btn-home-open-setup',
  'btn-home-close-setup',
  'btn-login-back-home',
  'btn-login-open-workspace',
  'btn-login-send-code',
  'btn-login-verify-code',
  'btn-checkout-monthly',
  'btn-checkout-yearly',
  'login-email',
  'login-code',
  'login-status-message',
  'checkout-status-message',
  'login-demo-notice',
  'app-shell-setup-panel',
  'app-shell-setup-summary',
  'app-shell-setup-groups',
  'app-shell-setup-actions',
  'login-readiness-hint',
  'app-shell-saas-detail',
  'app-shell-saas-status',
  'app-shell-saas-card',
];
const elements = new Map(ids.map((id) => [id, createElement(id)]));
const body = { dataset: {} };

const fakeWindow = {
  document: {
    readyState: 'complete',
    body,
    getElementById: (id) => elements.get(id) || null,
    addEventListener() {},
  },
  location: { hash: '' },
  history: {
    replaceState(_state, _title, hash) { fakeWindow.location.hash = hash; },
  },
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  addEventListener() {},
  dispatchEvent() {},
  BuildPlanAuth: {
    requestEmailOtp: async (email) => ({ sent: true, email, message: 'Login code sent' }),
    verifyEmailOtp: async (email) => ({ authenticated: true, user: { email } }),
  },
};
fakeWindow.window = fakeWindow;

const html = readText('index.html');
const shell = readText('assets/js/services/app-shell.js');
const checks = [];
function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail });
  if (!ok) throw new Error(id + (detail ? ': ' + detail : ''));
}

check('home-page-markup', html.includes('id="app-home-page"'));
check('workspace-button-markup', html.includes('id="btn-home-open-workspace"'));
check('workspace-back-home-markup', html.includes('id="btn-workspace-back-home"'));
check('ct-program-selector-markup', html.includes('id="ct-program-selector"'));
check('ct-user-dashboard-markup', html.includes('id="ct-user-dashboard"'));
check('ct-user-dashboard-reference', html.includes('ct-dashboard-ref-page') && html.includes('ct-ref-quick-actions') && html.includes('data-ct-plan-storage'));
check('ct-admin-dashboard-markup', html.includes('id="ct-admin-dashboard"'));
check('ct-chatbot-markup', html.includes('id="ct-help-chatbot"'));
check('ct-mock-app-script', html.includes('assets/js/services/ct-saas-mock-app.js?v=phase38'));
check('ct-subscription-js', readText('assets/js/services/ct-saas-mock-app.js').includes('setSubscriptionScenario'));
check('ct-billing-modal-markup', html.includes('id="ct-billing-modal"'));
check('ct-billing-js', readText('assets/js/services/ct-saas-mock-app.js').includes('openBilling') && readText('assets/js/services/ct-saas-mock-app.js').includes('choosePlan'));
check('ct-program-selector-markup', html.includes('id="ct-program-selector"'));
check('ct-user-dashboard-markup', html.includes('id="ct-user-dashboard"'));
check('ct-admin-dashboard-markup', html.includes('id="ct-admin-dashboard"'));
check('ct-chatbot-markup', html.includes('id="ct-help-chatbot"'));
check('ct-mock-app-script', html.includes('assets/js/services/ct-saas-mock-app.js?v=phase38'));
check('ct-program-selector-markup', html.includes('id="ct-program-selector"'));
check('ct-user-dashboard-markup', html.includes('id="ct-user-dashboard"'));
check('ct-admin-dashboard-markup', html.includes('id="ct-admin-dashboard"'));
check('ct-chatbot-markup', html.includes('id="ct-help-chatbot"'));
check('ct-mock-app-script', html.includes('assets/js/services/ct-saas-mock-app.js?v=phase38'));
check('ct-program-selector-markup', html.includes('id="ct-program-selector"'));
check('ct-user-dashboard-markup', html.includes('id="ct-user-dashboard"'));
check('ct-admin-dashboard-markup', html.includes('id="ct-admin-dashboard"'));
check('ct-chatbot-markup', html.includes('id="ct-help-chatbot"'));
check('ct-mock-app-script', html.includes('assets/js/services/ct-saas-mock-app.js?v=phase38'));
check('ct-program-selector-markup', html.includes('id="ct-program-selector"'));
check('ct-user-dashboard-markup', html.includes('id="ct-user-dashboard"'));
check('ct-admin-dashboard-markup', html.includes('id="ct-admin-dashboard"'));
check('ct-chatbot-markup', html.includes('id="ct-help-chatbot"'));
check('ct-mock-app-script', html.includes('assets/js/services/ct-saas-mock-app.js?v=phase38'));
check('polished-home-copy', html.includes('BuildPlan Pro') && html.includes('สมัครสมาชิกเพื่อเริ่มใช้งานฟรี'));
check('plan-entry-login-card-markup', html.includes('ct-login-panel') && html.includes('ct-login-submit') && html.includes('ct-current-package'));
check('phase46-project-popup-markup', html.includes('id="project-start-popup"') && html.includes('project-popup-name') && html.includes('project-popup-supervisor'));
check('phase46-actual-table-markers', readText('assets/js/modules/06-actual-dashboard.js').includes('actual-task-name-resizer') && readText('assets/js/modules/06-actual-dashboard.js').includes('getEffectiveActualPercentForTask'));
check('phase46-gantt-actual-markers', readText('assets/js/modules/05-gantt-rendering.js').includes('actual-gantt-bar') && readText('assets/js/modules/05-gantt-rendering.js').includes('today-progress-popover'));
check('phase46-project-popup-shell', readText('assets/js/services/app-shell.js').includes('openProjectStartPopup') && readText('assets/js/services/app-shell.js').includes('applyProjectStartForm'));
check('plan-only-pricing', html.includes('ct-plan-price-row') && html.includes('data-plan="199"') && html.includes('data-plan="599"') && !html.includes('value="Enterprise"'));
check('cache-busted-css', html.includes('assets/css/buildplan.css?v=phase30'));
check('dark-mode-contrast-css', readText('assets/css/buildplan.css').includes('actual-date-complete') && readText('assets/css/buildplan.css').includes('chart-axis-text') && readText('assets/css/buildplan.css').includes('body[data-view-mode="dark"] .text-blue-700'));
check('cache-busted-core-js', html.includes('assets/js/modules/01-core-state.js?v=phase29'));
check('display-mode-controls', html.includes('data-view-mode-choice="light"') && html.includes('data-view-mode-choice="dark"') && html.includes('data-view-mode-choice="read"'));
check('actual-start-date-column', readText('assets/js/modules/06-actual-dashboard.js').includes('getTaskActualStartRecord') && readText('assets/js/modules/06-actual-dashboard.js').includes('actual-start-date'));
check('cache-busted-app-shell-js', html.includes('assets/js/services/app-shell.js?v=phase31'));
check('public-beta-saas-mode', readText('assets/js/config/app-config.js').includes("mode: 'public-beta'"));
check('public-beta-startup-api', readText('assets/js/config/app-config.js').includes("session: '/api/session'") && readText('assets/js/config/app-config.js').includes("readiness: '/api/system/readiness'"));
const appShellCss = readText('assets/css/modules/05-app-shell.css');
check('home-background-image-css', appShellCss.includes('home-construction-bg.png?v=phase28'));
check('ct-saas-css', appShellCss.includes('Phase 37: Construction Tech SaaS mock frontend prototype'));
check('reference-landing-marker', html.includes('ct-reference-landing') && appShellCss.includes('Phase 41: reference-matched landing/login screen'));
check('ct-saas-js-file', fs.existsSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js')));
check('ct-saas-css', appShellCss.includes('Phase 37: Construction Tech SaaS mock frontend prototype'));
check('ct-saas-js-file', fs.existsSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js')));
check('ct-saas-css', appShellCss.includes('Phase 37: Construction Tech SaaS mock frontend prototype'));
check('ct-saas-js-file', fs.existsSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js')));
check('ct-saas-css', appShellCss.includes('Phase 37: Construction Tech SaaS mock frontend prototype'));
check('ct-saas-js-file', fs.existsSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js')));
check('ct-saas-css', appShellCss.includes('Phase 37: Construction Tech SaaS mock frontend prototype'));
check('ct-saas-js-file', fs.existsSync(path.join(projectDir, 'assets/js/services/ct-saas-mock-app.js')));
check('sarabun-app-shell-css', appShellCss.includes('font-family: "Sarabun", sans-serif'));
check('saas-guidance-doc', fs.existsSync(path.join(projectDir, 'docs/SAAS_LAUNCH_CHECKLIST_TH.md')));
check('readiness-next-actions-api', readText('api/system/readiness.js').includes('nextActions'));
check('api-env-guard-helper', readText('api/_shared.js').includes('envGuardPayload'));
check('checkout-env-guard', readText('api/checkout.js').includes('Stripe Billing'));
check('cloud-env-guard', readText('api/projects/index.js').includes('Supabase Cloud Save'));
check('saas-launch-doctor-tool', fs.existsSync(path.join(projectDir, 'tools/saas-launch-doctor.js')));
check('saas-doctor-script', readText('package.json').includes('"saas:doctor"'));
check('vercel-env-plan-tool', fs.existsSync(path.join(projectDir, 'tools/vercel-env-plan.js')));
check('saas-env-script', readText('package.json').includes('"saas:env"'));
check('production-env-example', fs.existsSync(path.join(projectDir, '.env.production.example')));
check('vercel-env-push-tool', fs.existsSync(path.join(projectDir, 'tools/vercel-env-push.ps1')));
check('saas-env-push-script', readText('package.json').includes('"saas:env:push"'));
check('saas-activation-wizard', fs.existsSync(path.join(projectDir, 'tools/saas-activate.ps1')));
check('saas-activate-script', readText('package.json').includes('"saas:activate"'));

vm.runInNewContext(shell, {
  window: fakeWindow,
  document: fakeWindow.document,
  CustomEvent: fakeWindow.CustomEvent,
  console,
});

check('namespace-created', typeof fakeWindow.BuildPlanAppShell?.navigateTo === 'function');
check('initial-route-home', body.dataset.appRoute === 'home', body.dataset.appRoute);
check('home-visible-on-home', elements.get('app-home-page').style.display === 'flex', elements.get('app-home-page').style.display);
check('workspace-hidden-on-home', elements.get('top-ribbon').style.display === 'none', elements.get('top-ribbon').style.display);
check('programs-hidden-on-home', elements.get('ct-program-selector').style.display === 'none', elements.get('ct-program-selector').style.display);
check('programs-hidden-on-home', elements.get('ct-program-selector').style.display === 'none', elements.get('ct-program-selector').style.display);
check('programs-hidden-on-home', elements.get('ct-program-selector').style.display === 'none', elements.get('ct-program-selector').style.display);
check('programs-hidden-on-home', elements.get('ct-program-selector').style.display === 'none', elements.get('ct-program-selector').style.display);
check('programs-hidden-on-home', elements.get('ct-program-selector').style.display === 'none', elements.get('ct-program-selector').style.display);
fakeWindow.BuildPlanAppShell.navigateLogin();
check('route-login', body.dataset.appRoute === 'login', body.dataset.appRoute);
check('home-hidden-on-login', elements.get('app-home-page').style.display === 'none', elements.get('app-home-page').style.display);
check('login-route-kept-legacy-safe', body.dataset.appRoute === 'login', body.dataset.appRoute);
elements.get('login-email').value = 'user@example.com';
elements.get('login-code').value = '123456';
fakeWindow.BuildPlanAppShell.navigateTo('programs');
check('route-programs', body.dataset.appRoute === 'programs', body.dataset.appRoute);
check('programs-visible', elements.get('ct-program-selector').style.display === 'flex', elements.get('ct-program-selector').style.display);
check('chatbot-visible-on-programs', elements.get('ct-help-chatbot').style.display === 'block', elements.get('ct-help-chatbot').style.display);
fakeWindow.BuildPlanAppShell.navigateTo('billing');
check('route-billing', body.dataset.appRoute === 'billing', body.dataset.appRoute);
check('billing-programs-visible', elements.get('ct-program-selector').style.display === 'flex', elements.get('ct-program-selector').style.display);
fakeWindow.BuildPlanAppShell.navigateTo('user-dashboard');
check('route-user-dashboard', body.dataset.appRoute === 'user-dashboard', body.dataset.appRoute);
check('user-dashboard-visible', elements.get('ct-user-dashboard').style.display === 'flex', elements.get('ct-user-dashboard').style.display);
fakeWindow.BuildPlanAppShell.navigateTo('admin-dashboard');
check('route-admin-dashboard', body.dataset.appRoute === 'admin-dashboard', body.dataset.appRoute);
check('admin-dashboard-visible', elements.get('ct-admin-dashboard').style.display === 'flex', elements.get('ct-admin-dashboard').style.display);
fakeWindow.BuildPlanAppShell.navigateWorkspace();
check('route-workspace', body.dataset.appRoute === 'workspace', body.dataset.appRoute);
check('home-hidden-on-workspace', elements.get('app-home-page').style.display === 'none', elements.get('app-home-page').style.display);
check('workspace-visible-on-workspace', elements.get('top-ribbon').style.display !== 'none', elements.get('top-ribbon').style.display);
check('home-button-bound', typeof elements.get('btn-home-open-workspace').listeners.click === 'function');
check('workspace-back-home-bound', typeof elements.get('btn-workspace-back-home').listeners.click === 'function');
fakeWindow.BuildPlanAppShell.applyReadiness({ configured: false, missing: ['A', 'B', 'C'] });
check('demo-readiness-label', elements.get('app-shell-saas-status').textContent.length > 0, elements.get('app-shell-saas-status').textContent);
check('demo-readiness-tone', elements.get('app-shell-saas-card').dataset.tone === 'demo', elements.get('app-shell-saas-card').dataset.tone);
fakeWindow.BuildPlanAppShell.applyReadiness({ configured: true, missing: [] });
check('ready-readiness-label', elements.get('app-shell-saas-status').textContent.length > 0, elements.get('app-shell-saas-status').textContent);
check('ready-readiness-tone', elements.get('app-shell-saas-card').dataset.tone === 'ready', elements.get('app-shell-saas-card').dataset.tone);

const report = {
  ok: checks.every((item) => item.ok),
  checkedAt: new Date().toISOString(),
  checks,
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('app shell smoke ok');
console.log('checks:', checks.length);
console.log('report:', path.relative(projectDir, reportPath));
