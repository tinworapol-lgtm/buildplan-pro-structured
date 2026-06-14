const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const reportDir = path.join(projectDir, 'reports');
const reportPath = path.join(reportDir, 'account-cloud-smoke-phase-20.json');

function readText(relativePath) {
  return fs.readFileSync(path.join(projectDir, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function createElement(tagName, documentRef) {
  const listeners = {};
  const classes = new Set();
  const element = {
    tagName: tagName.toUpperCase(),
    id: '',
    value: '',
    textContent: '',
    children: [],
    listeners,
    className: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      replace: (from, to) => {
        const had = classes.delete(from);
        classes.add(to);
        return had;
      },
    },
    addEventListener: (eventName, handler) => {
      listeners[eventName] = handler;
    },
    appendChild: (child) => {
      element.children.push(child);
      if (child.id) documentRef.elements.set(child.id, child);
      return child;
    },
    set innerHTML(value) {
      element._innerHTML = value;
      const idMatches = [...value.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
      for (const id of idMatches) {
        const child = createElement('div', documentRef);
        child.id = id;
        documentRef.elements.set(id, child);
      }
    },
    get innerHTML() {
      return element._innerHTML || '';
    },
  };
  Object.defineProperty(element, 'className', {
    get: () => [...classes].join(' '),
    set: (value) => {
      classes.clear();
      String(value || '').split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
    },
  });
  return element;
}

function createFakeDocument() {
  const documentRef = {
    elements: new Map(),
    readyState: 'complete',
    createElement(tagName) {
      return createElement(tagName, documentRef);
    },
    getElementById(id) {
      return documentRef.elements.get(id) || null;
    },
    addEventListener() {},
  };
  const body = createElement('body', documentRef);
  body.id = 'body';
  documentRef.body = body;
  documentRef.elements.set('body', body);
  const accountButton = createElement('button', documentRef);
  accountButton.id = 'btn-account-cloud';
  documentRef.elements.set(accountButton.id, accountButton);
  return documentRef;
}

const html = readText('index.html');
const service = readText('assets/js/services/account-cloud-ui.js');

const checks = [];
function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail });
  if (!ok) throw new Error(id + (detail ? ': ' + detail : ''));
}

check('html-has-account-button', html.includes('id="btn-account-cloud"'));
check('html-loads-account-cloud-ui', html.includes('assets/js/services/account-cloud-ui.js'));
check('service-exposes-namespace', service.includes('BuildPlanAccountCloud'));

const fakeDocument = createFakeDocument();
const fakeWindow = {
  document: fakeDocument,
  BuildPlanAuth: {
    refreshSession: async () => ({ authenticated: false, configured: false, user: null }),
  },
  BuildPlanLicense: {
    refreshLicenseStatus: async () => ({ status: 'active' }),
  },
  BuildPlanSaaS: {
    refreshReadiness: async () => ({ configured: false, missing: ['SUPABASE_URL'] }),
  },
  BuildPlanCloud: {
    saveProject: async () => ({ configured: false, message: 'Cloud project endpoint is not configured' }),
    listProjects: async () => ({
      projects: [
        {
          id: 'project-123',
          name: 'อาคารสำนักงาน ABC',
          updatedAt: '2026-06-14T08:30:00.000Z',
        },
      ],
    }),
    applyCloudProject: async (projectId) => ({
      project: { id: projectId, name: 'อาคารสำนักงาน ABC', payload: { tasks: [] } },
    }),
    renameProject: async (projectId, name) => ({
      project: { id: projectId, name, updatedAt: '2026-06-14T09:00:00.000Z' },
    }),
  },
  addEventListener() {},
  dispatchEvent() {},
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
};
fakeWindow.window = fakeWindow;

vm.runInNewContext(service, {
  window: fakeWindow,
  document: fakeDocument,
  CustomEvent: fakeWindow.CustomEvent,
  console,
});

check('namespace-created', typeof fakeWindow.BuildPlanAccountCloud?.openPanel === 'function');
check('button-has-click-listener', typeof fakeDocument.getElementById('btn-account-cloud')?.listeners?.click === 'function');

fakeWindow.BuildPlanAccountCloud.openPanel();
const panel = fakeDocument.getElementById('account-cloud-panel');
check('account-cloud-panel-created', !!panel);
check('panel-opened', panel.classList.contains('flex'), panel.className);
check('email-input-created', !!fakeDocument.getElementById('account-cloud-email'));
check('save-button-created', !!fakeDocument.getElementById('account-cloud-save'));
check('list-button-created', !!fakeDocument.getElementById('account-cloud-list'));
check('project-list-created', !!fakeDocument.getElementById('account-cloud-projects'));
check('service-exposes-load-project', typeof fakeWindow.BuildPlanAccountCloud?.openCloudProject === 'function');
check('service-exposes-rename-project', typeof fakeWindow.BuildPlanAccountCloud?.renameCloudProject === 'function');

Promise.resolve()
  .then(() => fakeWindow.BuildPlanAccountCloud.loadCloudList())
  .then(() => {
    const projectList = fakeDocument.getElementById('account-cloud-projects');
    check('project-card-rendered', projectList.innerHTML.includes('อาคารสำนักงาน ABC'));
    check('project-open-action-rendered', projectList.innerHTML.includes('data-cloud-open="project-123"'));
    check('project-rename-action-rendered', projectList.innerHTML.includes('data-cloud-rename="project-123"'));

    const report = {
      ok: checks.every((item) => item.ok),
      checkedAt: new Date().toISOString(),
      checks,
      mode: 'vm-dom-smoke',
    };
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log('account/cloud smoke ok');
    console.log('checks:', checks.length);
    console.log('report:', path.relative(projectDir, reportPath));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
