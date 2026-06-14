const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectDir, 'assets/js/services/cloud-save-adapter.js'), 'utf8');
const storage = new Map();
const requests = [];

const fakeWindow = {
  BuildPlanConfig: {
    licensing: { mode: 'public-beta' },
    cloud: { provider: 'supabase', endpoints: { projects: '/api/projects' } },
  },
  BuildPlanAuth: {
    getAuthorizationHeaders: () => ({ Authorization: 'Bearer test-token' }),
  },
  localStorage: {
    getItem: (key) => storage.get(key) || '',
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  collectProjectData: () => ({
    info: { name: 'อาคารสำนักงาน ABC' },
    tasks: [{ id: '1.1', name: 'งานเตรียมพื้นที่' }],
  }),
  applyProjectData(payload) {
    fakeWindow.appliedPayload = payload;
  },
};
fakeWindow.window = fakeWindow;

async function fetchMock(url, options = {}) {
  requests.push({ url, options });
  if (options.method === 'POST') {
    return {
      ok: true,
      json: async () => ({
        project: {
          id: 'project-123',
          name: 'อาคารสำนักงาน ABC',
          updatedAt: '2026-06-14T09:00:00.000Z',
        },
      }),
    };
  }
  if (options.method === 'PATCH') {
    return {
      ok: true,
      json: async () => ({
        project: {
          id: 'project-123',
          name: 'อาคารสำนักงานปรับปรุง',
          updatedAt: '2026-06-14T09:10:00.000Z',
        },
      }),
    };
  }
  return {
    ok: true,
    json: async () => ({
      project: {
        id: 'project-123',
        name: 'อาคารสำนักงาน ABC',
        payload: { tasks: [{ id: '1.1', name: 'งานเตรียมพื้นที่' }] },
      },
    }),
  };
}

vm.runInNewContext(source, {
  window: fakeWindow,
  fetch: fetchMock,
  console,
  encodeURIComponent,
});

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

(async () => {
  const cloud = fakeWindow.BuildPlanCloud;
  assert(typeof cloud.getCurrentProjectId === 'function', 'getCurrentProjectId is missing');
  assert(typeof cloud.renameProject === 'function', 'renameProject is missing');

  await cloud.applyCloudProject('project-123');
  assert(cloud.getCurrentProjectId() === 'project-123', 'loaded project id was not remembered');
  assert(fakeWindow.appliedPayload?.tasks?.length === 1, 'loaded project payload was not applied');

  await cloud.saveProject();
  const saveBody = JSON.parse(requests.find((request) => request.options.method === 'POST').options.body);
  assert(saveBody.id === 'project-123', 'save did not update the current project');

  await cloud.renameProject('project-123', 'อาคารสำนักงานปรับปรุง');
  const renameRequest = requests.find((request) => request.options.method === 'PATCH');
  assert(renameRequest?.url.includes('id=project-123'), 'rename did not target the selected project');

  console.log('cloud current project smoke ok');
})();
