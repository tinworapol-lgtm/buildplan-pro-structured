const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'static-first-no-api-smoke-phase-70.json');

function read(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function createElement(id) {
  const listeners = {};
  const classNames = new Set(['hidden']);
  return {
    id,
    value: '',
    hidden: false,
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    listeners,
    setAttribute() {},
    focus() {},
    addEventListener: (name, handler) => { listeners[name] = handler; },
    classList: {
      contains: (name) => classNames.has(name),
      add: (name) => classNames.add(name),
      remove: (name) => classNames.delete(name),
      replace: (from, to) => {
        classNames.delete(from);
        classNames.add(to);
        return true;
      },
      toggle: (name, force) => {
        const shouldAdd = typeof force === 'boolean' ? force : !classNames.has(name);
        if (shouldAdd) classNames.add(name);
        else classNames.delete(name);
        return shouldAdd;
      },
    },
  };
}

const ids = [
  'app-home-page',
  'app-login-page',
  'ct-program-selector',
  'ct-user-dashboard',
  'ct-admin-dashboard',
  'ct-help-chatbot',
  'ct-billing-modal',
  'top-ribbon',
  'project-info-header',
  'gantt-page',
  'dashboard-page',
  'actual-page',
  'cost-page',
  'duration-page',
  'signature-section',
  'btn-account-cloud',
  'account-cloud-badge',
  'btn-home-open-workspace',
  'btn-home-login',
  'btn-home-signup',
  'btn-hero-signup',
  'btn-login-panel-signup',
  'member-signup-modal',
  'member-signup-close',
  'btn-signup-send-code',
  'btn-signup-verify-code',
  'btn-signup-go-login',
  'btn-home-open-setup',
  'btn-home-close-setup',
  'btn-login-back-home',
  'btn-workspace-back-home',
  'btn-login-open-workspace',
  'btn-login-send-code',
  'btn-login-verify-code',
  'btn-checkout-monthly',
  'btn-checkout-yearly',
  'login-status-message',
  'signup-status-message',
  'checkout-status-message',
  'login-readiness-hint',
  'login-demo-notice',
  'app-shell-saas-status',
  'app-shell-saas-detail',
  'app-shell-saas-card',
  'app-shell-setup-panel',
  'app-shell-setup-summary',
  'app-shell-setup-groups',
  'app-shell-setup-actions',
  'project-start-form',
];

const elements = new Map(ids.map((id) => [id, createElement(id)]));
const body = createElement('body');
body.appendChild = (element) => {
  if (element?.id) elements.set(element.id, element);
};

const fetchCalls = [];
const windowEventListeners = [];

const fakeWindow = {
  document: {
    readyState: 'complete',
    body,
    createElement: (tagName) => createElement(tagName),
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: () => [],
    addEventListener() {},
  },
  localStorage: {
    getItem: () => '',
    setItem() {},
    removeItem() {},
  },
  navigator: { userAgent: 'static-first-smoke' },
  location: { hash: '', href: 'https://buildplan-pro-structured.vercel.app/#home' },
  history: {
    replaceState(_state, _title, hash) { fakeWindow.location.hash = hash; },
  },
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  Event: class Event {
    constructor(type) { this.type = type; }
  },
  addEventListener: (name, handler) => windowEventListeners.push({ name, handler }),
  dispatchEvent() {},
  fetch: async (url, options = {}) => {
    fetchCalls.push({ url: String(url), method: options.method || 'GET' });
    return {
      ok: true,
      json: async () => ({}),
    };
  },
  console,
};
fakeWindow.window = fakeWindow;

const scripts = [
  'assets/js/config/app-config.js',
  'assets/js/services/saas-readiness-adapter.js',
  'assets/js/services/auth-adapter.js',
  'assets/js/services/license-adapter.js',
  'assets/js/services/account-cloud-ui.js',
  'assets/js/services/error-logger.js',
  'assets/js/services/app-shell.js',
];

for (const script of scripts) {
  vm.runInNewContext(read(script), {
    window: fakeWindow,
    document: fakeWindow.document,
    localStorage: fakeWindow.localStorage,
    navigator: fakeWindow.navigator,
    location: fakeWindow.location,
    history: fakeWindow.history,
    CustomEvent: fakeWindow.CustomEvent,
    Event: fakeWindow.Event,
    fetch: fakeWindow.fetch,
    console,
  }, { filename: script });
}

const apiCalls = fetchCalls.filter((call) => /\/api\//.test(call.url));
const report = {
  ok: fetchCalls.length === 0 && apiCalls.length === 0,
  checkedAt: new Date().toISOString(),
  scripts,
  fetchCalls,
  apiCalls,
  windowEventListeners: windowEventListeners.map((item) => item.name),
  route: body.dataset.appRoute || '',
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

if (!report.ok) {
  console.error('FAIL static-first-no-api-smoke');
  console.error('fetch calls:', JSON.stringify(fetchCalls, null, 2));
  process.exit(1);
}

console.log('PASS static-first-no-api-smoke');
console.log('fetch calls:', fetchCalls.length);
console.log('report:', path.relative(projectDir, reportPath));
