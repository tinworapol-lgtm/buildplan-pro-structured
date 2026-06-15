const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const servicePath = path.join(projectDir, 'assets/js/services/project-hub.js');

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function createElement() {
  const listeners = {};
  return {
    textContent: '',
    innerHTML: '',
    dataset: {},
    listeners,
    addEventListener(eventName, handler) {
      listeners[eventName] = handler;
    },
  };
}

function createHarness() {
  const elements = {
    '[data-project-hub-email]': createElement(),
    '[data-project-hub-count]': createElement(),
    '[data-project-hub-status]': createElement(),
    '[data-project-hub-list]': createElement(),
    '[data-project-hub-refresh]': createElement(),
    '[data-project-hub-new]': createElement(),
  };
  const routeListeners = {};
  const navigation = [];
  let session = {
    authenticated: true,
    user: { email: 'owner@example.com' },
  };
  let listResult = {
    projects: [{
      id: 'p1',
      name: 'อาคารสำนักงาน ABC',
      updatedAt: '2026-06-14T08:30:00Z',
    }],
  };

  const fakeWindow = {
    document: {
      readyState: 'complete',
      querySelector(selector) {
        return elements[selector] || null;
      },
      addEventListener() {},
    },
    BuildPlanAuth: {
      async refreshSession() {
        return session;
      },
    },
    BuildPlanCloud: {
      async listProjects() {
        if (listResult instanceof Error) throw listResult;
        return listResult;
      },
    },
    BuildPlanAppShell: {
      navigateTo(route) {
        navigation.push(route);
      },
    },
    addEventListener(eventName, handler) {
      routeListeners[eventName] = handler;
    },
  };
  fakeWindow.window = fakeWindow;

  return {
    elements,
    fakeWindow,
    navigation,
    setSession(value) {
      session = value;
    },
    setListResult(value) {
      listResult = value;
    },
  };
}

if (!fs.existsSync(servicePath)) {
  throw new Error('project hub service does not exist');
}

const source = fs.readFileSync(servicePath, 'utf8').replace(/^\uFEFF/, '');
const harness = createHarness();
vm.runInNewContext(source, {
  window: harness.fakeWindow,
  document: harness.fakeWindow.document,
  console,
});

(async () => {
  const hub = harness.fakeWindow.BuildPlanProjectHub;
  assert(typeof hub?.load === 'function', 'window.BuildPlanProjectHub.load is missing');

  await hub.load();
  const listMarkup = harness.elements['[data-project-hub-list]'].innerHTML;
  assert(listMarkup.includes('อาคารสำนักงาน ABC'), 'project name was not rendered');
  assert(listMarkup.includes('data-project-hub-open="p1"'), 'open action was not rendered');
  assert(listMarkup.includes('data-project-hub-rename="p1"'), 'rename action was not rendered');
  assert(listMarkup.includes('data-project-hub-duplicate="p1"'), 'duplicate action was not rendered');
  assert(listMarkup.includes('data-project-hub-archive="p1"'), 'archive action was not rendered');
  assert(harness.elements['[data-project-hub-email]'].textContent === 'owner@example.com', 'user email was not rendered');
  assert(harness.elements['[data-project-hub-count]'].textContent === '1', 'project count was not rendered');

  harness.setSession({ authenticated: false, user: null });
  await hub.load();
  assert(harness.navigation.at(-1) === 'login', 'unauthenticated user was not sent to login');

  harness.setSession({ authenticated: true, user: { email: 'owner@example.com' } });
  harness.setListResult({ projects: [] });
  await hub.load();
  assert(
    /ยังไม่มีโครงการ|สร้างโครงการใหม่/.test(harness.elements['[data-project-hub-list]'].innerHTML),
    'empty project state was not meaningful',
  );

  harness.setListResult(new Error('Cloud unavailable'));
  const errorResult = await hub.load();
  assert(errorResult?.ok === false, 'failed project load did not return a recoverable result');
  assert(
    harness.elements['[data-project-hub-status]'].textContent.includes('Cloud unavailable'),
    'failed project load was not rendered in the status area',
  );

  console.log('project hub smoke ok');
})();
