const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'member-signup-smoke-phase-66.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function createClassList(initial = '') {
  const values = new Set(initial.split(/\s+/).filter(Boolean));
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    contains: (item) => values.has(item),
    replace: (oldValue, newValue) => {
      if (values.has(oldValue)) {
        values.delete(oldValue);
        values.add(newValue);
        return true;
      }
      return false;
    },
    toggle: (item, force) => {
      const shouldAdd = typeof force === 'boolean' ? force : !values.has(item);
      if (shouldAdd) values.add(item);
      else values.delete(item);
      return shouldAdd;
    },
    toString: () => Array.from(values).join(' '),
  };
}

function createElement(id, options = {}) {
  const listeners = {};
  return {
    id,
    value: options.value || '',
    textContent: '',
    dataset: {},
    style: {},
    hidden: false,
    listeners,
    classList: createClassList(options.className || ''),
    setAttribute(name, value) { this[name] = value; },
    getAttribute(name) { return this[name]; },
    addEventListener(eventName, handler) { listeners[eventName] = handler; },
    dispatchEvent(event) {
      const handler = listeners[event.type || event];
      if (handler) handler(event);
    },
    focus() {},
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
  'dashboard-page',
  'actual-page',
  'cost-page',
  'duration-page',
  'signature-section',
  'btn-workspace-back-home',
  'btn-login-panel-signup',
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
  'member-signup-modal',
  'member-signup-close',
  'member-signup-form',
  'signup-full-name',
  'signup-email',
  'signup-phone',
  'signup-organization',
  'signup-role',
  'signup-otp-code',
  'btn-signup-send-code',
  'btn-signup-verify-code',
  'btn-signup-go-login',
  'signup-status-message',
];

const elements = new Map(ids.map((id) => [id, createElement(id, {
  className: id === 'member-signup-modal' || id === 'app-shell-setup-panel' ? 'hidden' : '',
})]));
elements.get('signup-full-name').value = 'Test Engineer';
elements.get('signup-email').value = 'member@example.com';
elements.get('signup-phone').value = '0812345678';
elements.get('signup-organization').value = 'BuildPlan Test Co.';
elements.get('signup-role').value = 'engineer';
elements.get('signup-otp-code').value = '123456';

let readinessState = {
  configured: false,
  envStatus: { supabase: { complete: false } },
  supabase: { url: false },
};
const otpRequests = [];
const otpVerifications = [];
const events = [];
const body = { dataset: {}, classList: createClassList('') };

const fakeWindow = {
  document: {
    readyState: 'complete',
    body,
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: () => [],
    addEventListener() {},
  },
  location: { hash: '' },
  history: {
    replaceState(_state, _title, hash) { fakeWindow.location.hash = hash; },
  },
  Event: class Event {
    constructor(type) {
      this.type = type;
    }
  },
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  addEventListener() {},
  dispatchEvent(event) { events.push(event); },
  BuildPlanSaaS: {
    getReadinessState: () => readinessState,
    refreshReadiness: async () => readinessState,
  },
  // Markers: BuildPlanAuth.requestEmailOtp / BuildPlanAuth.verifyEmailOtp are exercised through app-shell optional chaining.
  BuildPlanAuth: {
    requestEmailOtp: async (email, memberProfile, signupMode) => {
      otpRequests.push({ email, memberProfile, signupMode });
      return { sent: true, email, message: 'Login code sent' };
    },
    verifyEmailOtp: async (email, token, memberProfile) => {
      otpVerifications.push({ email, token, memberProfile });
      return {
        authenticated: true,
        user: { email },
        memberProfile,
      };
    },
  },
  renderUI() {},
  scheduleAutoSave() {},
};
fakeWindow.window = fakeWindow;

const html = readText('index.html');
const shell = readText('assets/js/services/app-shell.js');
const checks = [];

function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail });
  if (!ok) throw new Error(id + (detail ? ': ' + detail : ''));
}

check('member-signup-entry-cta-simplified', !html.includes('id="btn-home-signup"') && !html.includes('id="btn-hero-signup"') && html.includes('ct-free-access-row'));
check('landing-single-entry-button', html.includes('class="ct-login-submit"') && html.includes('data-ct-login-user'));
check('member-signup-modal-markup', html.includes('id="member-signup-modal"') && html.includes('id="signup-full-name"'));
check('member-signup-otp-markup', html.includes('id="signup-otp-code"') && html.includes('id="btn-signup-verify-code"'));
check('member-signup-shell-functions', shell.includes('submitSignupProfile') && shell.includes('verifySignupCode'));
check('member-signup-auth-calls', shell.includes('BuildPlanAuth?.requestEmailOtp') && shell.includes('BuildPlanAuth?.verifyEmailOtp'));

vm.runInNewContext(shell, {
  window: fakeWindow,
  document: fakeWindow.document,
  CustomEvent: fakeWindow.CustomEvent,
  Event: fakeWindow.Event,
  console,
});

check('namespace-created', typeof fakeWindow.BuildPlanAppShell?.openSignup === 'function');
fakeWindow.BuildPlanAppShell.openSignup();
check('signup-modal-opened', elements.get('member-signup-modal').classList.contains('flex'));
check('signup-disabled-message', elements.get('signup-status-message').textContent.includes('ระบบสมาชิกยังไม่เปิดใช้งาน'));

fakeWindow.BuildPlanAppShell.submitSignupProfile();
setImmediate(async () => {
  try {
    check('signup-disabled-does-not-call-auth', otpRequests.length === 0, JSON.stringify(otpRequests));

    readinessState = {
      configured: true,
      envStatus: { supabase: { complete: true } },
      supabase: { url: true },
    };
    await fakeWindow.BuildPlanAppShell.submitSignupProfile();
    check('signup-request-called-auth', otpRequests.length === 1, JSON.stringify(otpRequests));
    check('signup-request-email', otpRequests[0].email === 'member@example.com', otpRequests[0].email);
    check('signup-request-memberProfile', otpRequests[0].memberProfile.fullName === 'Test Engineer' && otpRequests[0].memberProfile.organization === 'BuildPlan Test Co.');
    check('signup-request-mode', otpRequests[0].signupMode === true);

    await fakeWindow.BuildPlanAppShell.verifySignupCode();
    check('signup-verify-called-auth', otpVerifications.length === 1, JSON.stringify(otpVerifications));
    check('signup-verify-memberProfile', otpVerifications[0].memberProfile.phone === '0812345678' && otpVerifications[0].memberProfile.role === 'engineer');
    check('route-workspace-after-signup', body.dataset.appRoute === 'workspace', body.dataset.appRoute);

    const report = {
      ok: checks.every((item) => item.ok),
      checkedAt: new Date().toISOString(),
      checks,
    };
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('member signup smoke ok');
    console.log('checks:', checks.length);
    console.log('report:', path.relative(projectDir, reportPath));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
});
