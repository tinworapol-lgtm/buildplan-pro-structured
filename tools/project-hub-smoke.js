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
      listeners[eventName] ||= [];
      listeners[eventName].push(handler);
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
    '[data-project-hub-home]': createElement(),
    '[data-project-hub-signout]': createElement(),
  };
  const routeListeners = {};
  const navigation = [];
  let homeNavigationCount = 0;
  let signOutCount = 0;
  let sessionCallCount = 0;
  let listCallCount = 0;
  let applyProjectId = '';
  const renamedProjects = [];
  const archivedProjects = [];
  let currentProjectId = 'p1';
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
        sessionCallCount += 1;
        return session;
      },
      clearAccessToken() {
        signOutCount += 1;
      },
    },
    BuildPlanCloud: {
      async listProjects() {
        listCallCount += 1;
        if (listResult instanceof Error) throw listResult;
        return listResult;
      },
      setCurrentProjectId(projectId) {
        currentProjectId = projectId || '';
      },
      async applyCloudProject(projectId) {
        applyProjectId = projectId;
        return { project: { id: projectId, name: 'Project A', payload: { tasks: [] } } };
      },
      async renameProject(projectId, name) {
        renamedProjects.push({ projectId, name });
        return { project: { id: projectId, name } };
      },
      async deleteProject(projectId) {
        archivedProjects.push(projectId);
        return { archived: true };
      },
    },
    BuildPlanAppShell: {
      navigateTo(route) {
        navigation.push(route);
      },
      navigateHome() {
        homeNavigationCount += 1;
        navigation.push('home');
      },
    },
    Swal: {
      async fire() {
        return { isConfirmed: true, value: 'Project B' };
      },
    },
    prompt() {
      return 'Project B';
    },
    confirm() {
      return true;
    },
    addEventListener(eventName, handler) {
      routeListeners[eventName] ||= [];
      routeListeners[eventName].push(handler);
    },
  };
  fakeWindow.window = fakeWindow;

  return {
    elements,
    fakeWindow,
    navigation,
    routeListeners,
    setSession(value) {
      session = value;
    },
    setListResult(value) {
      listResult = value;
    },
    counts() {
      return {
        homeNavigationCount,
        signOutCount,
        sessionCallCount,
        listCallCount,
        currentProjectId,
        applyProjectId,
        renamedProjects: renamedProjects.slice(),
        archivedProjects: archivedProjects.slice(),
      };
    },
    resetRequestCounts() {
      sessionCallCount = 0;
      listCallCount = 0;
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
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
  assert(listMarkup.includes('aria-label="เปิดโครงการ อาคารสำนักงาน ABC"'), 'open action aria-label is missing');
  assert(listMarkup.includes('aria-label="เปลี่ยนชื่อโครงการ อาคารสำนักงาน ABC"'), 'rename action aria-label is missing');
  assert(listMarkup.includes('aria-label="ทำสำเนาโครงการ อาคารสำนักงาน ABC"'), 'duplicate action aria-label is missing');
  assert(listMarkup.includes('aria-label="เก็บโครงการ อาคารสำนักงาน ABC"'), 'archive action aria-label is missing');
  assert(harness.elements['[data-project-hub-email]'].textContent === 'owner@example.com', 'user email was not rendered');
  assert(harness.elements['[data-project-hub-count]'].textContent === '1', 'project count was not rendered');

  const delayedSession = deferred();
  harness.setSession(delayedSession.promise);
  const delayedLoad = hub.load();
  assert(harness.elements['[data-project-hub-list]'].innerHTML === '', 'old project list was visible during session refresh');
  assert(harness.elements['[data-project-hub-email]'].textContent === '', 'old email was visible during session refresh');
  assert(harness.elements['[data-project-hub-count]'].textContent === '0', 'old count was visible during session refresh');
  assert(harness.elements['[data-project-hub-status]'].textContent === '', 'old status was visible during session refresh');
  delayedSession.resolve({ authenticated: true, user: { email: 'owner@example.com' } });
  await delayedLoad;

  harness.setSession({ authenticated: false, user: null });
  await hub.load();
  assert(harness.navigation.at(-1) === 'login', 'unauthenticated user was not sent to login');
  assert(harness.elements['[data-project-hub-list]'].innerHTML === '', 'unauthenticated project list was not cleared');
  assert(harness.elements['[data-project-hub-email]'].textContent === '', 'unauthenticated email was not cleared');
  assert(harness.elements['[data-project-hub-count]'].textContent === '0', 'unauthenticated count was not cleared');
  assert(harness.elements['[data-project-hub-status]'].textContent === '', 'unauthenticated status was not cleared');

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
  assert(harness.elements['[data-project-hub-count]'].textContent === '0', 'failed project load did not reset count');

  harness.setListResult({
    projects: [{
      id: 'p2',
      name: '<img src=x onerror="alert(1)">',
      updatedAt: '2026-06-14T08:30:00Z',
    }],
  });
  await hub.load();
  const maliciousMarkup = harness.elements['[data-project-hub-list]'].innerHTML;
  assert(!maliciousMarkup.includes('<img'), 'malicious project name was inserted as markup');
  assert(maliciousMarkup.includes('&lt;img'), 'malicious project name was not escaped');
  assert(maliciousMarkup.includes('aria-label="เปิดโครงการ &lt;img'), 'aria-label project name was not escaped');

  const bindingCounts = Object.fromEntries(
    Object.entries(harness.elements).map(([selector, element]) => [
      selector,
      Object.values(element.listeners).reduce((total, handlers) => total + handlers.length, 0),
    ]),
  );
  const routeBindingCount = (harness.routeListeners['buildplan:app-route'] || []).length;
  hub.initialize();
  assert(
    Object.entries(bindingCounts).every(([selector, count]) => (
      Object.values(harness.elements[selector].listeners).reduce((total, handlers) => total + handlers.length, 0) === count
    )),
    'initialize added duplicate element bindings',
  );
  assert(
    (harness.routeListeners['buildplan:app-route'] || []).length === routeBindingCount,
    'initialize added a duplicate route binding',
  );

  harness.elements['[data-project-hub-home]'].listeners.click[0]();
  assert(harness.navigation.at(-1) === 'home', 'home button did not use app-shell home navigation');
  harness.elements['[data-project-hub-signout]'].listeners.click[0]();
  assert(harness.counts().signOutCount === 1, 'sign-out button did not use the auth sign-out flow');
  assert(harness.counts().currentProjectId === '', 'sign-out button did not clear the current cloud project id');
  assert(harness.navigation.at(-1) === 'home', 'sign-out button did not return home');

  harness.setSession({ authenticated: true, user: { email: 'owner@example.com' } });
  const delayedProjects = deferred();
  harness.setListResult(delayedProjects.promise);
  const staleLoad = hub.load();
  await Promise.resolve();
  harness.elements['[data-project-hub-signout]'].listeners.click[0]();
  delayedProjects.resolve({
    projects: [{
      id: 'stale',
      name: 'Stale project',
      updatedAt: '2026-06-14T08:30:00Z',
    }],
  });
  const staleResult = await staleLoad;
  assert(staleResult?.stale === true, 'in-flight load did not report stale after sign-out');
  assert(harness.elements['[data-project-hub-list]'].innerHTML === '', 'stale project list rendered after sign-out');
  assert(harness.elements['[data-project-hub-email]'].textContent === '', 'stale email rendered after sign-out');
  assert(harness.elements['[data-project-hub-count]'].textContent === '0', 'stale count rendered after sign-out');

  harness.resetRequestCounts();
  harness.navigation.length = 0;
  const openResult = await hub.openProject('p1');
  assert(openResult?.ok === true, 'open project did not return ok');
  assert(harness.counts().applyProjectId === 'p1', 'open project did not apply the selected cloud project');
  assert(harness.navigation.at(-1) === 'workspace', 'open project did not route to workspace');

  harness.resetRequestCounts();
  const renameResult = await hub.renameProject('p1', 'Project B');
  const renameCalls = harness.counts().renamedProjects;
  assert(renameResult?.ok === true, 'rename project did not return ok');
  assert(renameCalls.length === 1, 'rename project did not call cloud rename once');
  assert(renameCalls[0].projectId === 'p1', 'rename project used the wrong project id');
  assert(renameCalls[0].name === 'Project B', 'rename project used the wrong next name');
  assert(harness.counts().listCallCount === 1, 'rename project did not reload the project list once');

  harness.resetRequestCounts();
  const archiveResult = await hub.archiveProject('p1', true);
  const archiveCalls = harness.counts().archivedProjects;
  assert(archiveResult?.ok === true, 'archive project did not return ok');
  assert(archiveCalls.length === 1, 'archive project did not call cloud archive once');
  assert(archiveCalls[0] === 'p1', 'archive project used the wrong project id');
  assert(harness.counts().listCallCount === 1, 'archive project did not reload the project list once');

  const originalApply = harness.fakeWindow.BuildPlanCloud.applyCloudProject;
  harness.fakeWindow.BuildPlanCloud.applyCloudProject = async () => {
    throw new Error('Open failed');
  };
  const failedOpen = await hub.openProject('p-error');
  assert(failedOpen?.ok === false, 'open project error did not return recoverable result');
  assert(
    harness.elements['[data-project-hub-status]'].textContent.includes('Open failed'),
    'open project error was not rendered in the status area',
  );
  harness.navigation.length = 0;
  harness.fakeWindow.BuildPlanCloud.applyCloudProject = async () => ({ ok: false, message: 'Apply failed' });
  const rejectedOpen = await hub.openProject('p-rejected');
  assert(rejectedOpen?.ok === false, 'open project rejected result did not return recoverable result');
  assert(harness.navigation.length === 0, 'open project routed to workspace after apply returned ok:false');
  assert(
    harness.elements['[data-project-hub-status]'].textContent.includes('Apply failed'),
    'open project rejected result was not rendered in the status area',
  );
  harness.fakeWindow.BuildPlanCloud.applyCloudProject = originalApply;

  const originalRename = harness.fakeWindow.BuildPlanCloud.renameProject;
  harness.fakeWindow.BuildPlanCloud.renameProject = async () => {
    throw new Error('Rename failed');
  };
  const failedRename = await hub.renameProject('p-error', 'Project X');
  assert(failedRename?.ok === false, 'rename project error did not return recoverable result');
  assert(
    harness.elements['[data-project-hub-status]'].textContent.includes('Rename failed'),
    'rename project error was not rendered in the status area',
  );
  harness.fakeWindow.BuildPlanCloud.renameProject = originalRename;

  const originalArchive = harness.fakeWindow.BuildPlanCloud.deleteProject;
  harness.fakeWindow.BuildPlanCloud.deleteProject = async () => {
    throw new Error('Archive failed');
  };
  const failedArchive = await hub.archiveProject('p-error', true);
  assert(failedArchive?.ok === false, 'archive project error did not return recoverable result');
  assert(
    harness.elements['[data-project-hub-status]'].textContent.includes('Archive failed'),
    'archive project error was not rendered in the status area',
  );
  harness.fakeWindow.BuildPlanCloud.deleteProject = originalArchive;

  harness.navigation.length = 0;
  const listClickHandler = harness.elements['[data-project-hub-list]'].listeners.click[0];
  const dispatchAction = async (dataset) => {
    listClickHandler({
      target: {
        closest() {
          return { dataset };
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  await dispatchAction({ projectHubOpen: 'p1' });
  assert(harness.counts().applyProjectId === 'p1', 'open action click did not apply selected project');
  assert(harness.navigation.at(-1) === 'workspace', 'open action click did not route to workspace');

  const renameCountBeforeClick = harness.counts().renamedProjects.length;
  await dispatchAction({ projectHubRename: 'p1' });
  assert(
    harness.counts().renamedProjects.length === renameCountBeforeClick + 1,
    'rename action click did not call renameProject',
  );

  const archiveCountBeforeClick = harness.counts().archivedProjects.length;
  await dispatchAction({ projectHubArchive: 'p1' });
  assert(
    harness.counts().archivedProjects.length === archiveCountBeforeClick + 1,
    'archive action click did not call archiveProject',
  );

  await dispatchAction({ projectHubDuplicate: 'p1' });
  assert(
    harness.elements['[data-project-hub-status]'].textContent,
    'duplicate action click did not render unavailable status',
  );

  harness.resetRequestCounts();
  harness.setSession({ authenticated: true, user: { email: 'owner@example.com' } });
  harness.setListResult({ projects: [] });
  const routeHandlers = harness.routeListeners['buildplan:app-route'] || [];
  routeHandlers[0]({ detail: { route: 'projects' } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(harness.counts().sessionCallCount === 1, 'projects route did not start one session refresh');
  assert(harness.counts().listCallCount === 1, 'projects route did not load projects exactly once');

  console.log('project hub smoke ok');
})();
