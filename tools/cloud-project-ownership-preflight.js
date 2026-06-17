const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(projectDir, 'api/projects/index.js'), 'utf8');
const accountUi = fs.readFileSync(path.join(projectDir, 'assets/js/services/account-cloud-ui.js'), 'utf8');
const gantt = fs.readFileSync(path.join(projectDir, 'assets/js/modules/05-gantt-rendering.js'), 'utf8');
const sharedPath = path.join(projectDir, 'api/_shared.js');
const projectsApiPath = path.join(projectDir, 'api/projects/index.js');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(
  api.includes("if (body.id)") &&
    api.includes("'&user_id=eq.' + encodeURIComponent(session.user.id)") &&
    api.includes("method: 'PATCH'"),
  'Updating an existing project must verify project ownership before writing'
);
check(
  !api.includes("projects?on_conflict=id"),
  'Project save must not use an unrestricted service-role upsert by id'
);
check(
  api.includes("action === 'duplicate'"),
  'Project API must expose an explicit duplicate action marker'
);
check(
  api.includes("'projects?id=eq.' + encodeURIComponent(projectId)") &&
    api.includes("'&user_id=eq.' + encodeURIComponent(session.user.id)") &&
    api.includes("'&archived_at=is.null&select=id,name,payload") &&
    api.includes("project.duplicate"),
  'Duplicate source query must verify session user ownership and active project state'
);
check(
  api.indexOf("action === 'duplicate'") > -1 &&
    api.indexOf("action === 'duplicate'") < api.indexOf('const body = await readJsonBody(request)'),
  'Duplicate must run before normal POST save body validation and must not trust caller-supplied payload/body id'
);
check(
  accountUi.includes('setCurrentProjectId?.(\'\')'),
  'Signing out must clear the current cloud project id'
);
check(
  gantt.includes("BuildPlanCloud?.setCurrentProjectId?.('')"),
  'Creating a new plan must clear the current cloud project id'
);

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(payload) {
      this.body = payload || '';
    },
    json() {
      return this.body ? JSON.parse(this.body) : {};
    },
  };
}

async function runDuplicateCase({ sourceRows, activeRows = [], expectedStatus, payloadLimit = '750000' }) {
  const previousLimit = process.env.BETA_PROJECT_PAYLOAD_BYTES;
  process.env.BETA_PROJECT_PAYLOAD_BYTES = payloadLimit;
  const calls = [];
  const mockShared = {
    sendJson(response, statusCode, payload) {
      response.statusCode = statusCode;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload));
    },
    getBearerToken: () => 'test-token',
    readJsonBody: async () => ({ projectData: { injected: true }, id: 'attacker-id' }),
    getSupabaseUser: async () => ({ ok: true, user: { id: 'user-123', email: 'owner@example.com' } }),
    hasSupabaseEnv: () => true,
    envGuardPayload: () => ({ configured: false }),
    writeAuditLog: async (userId, action, metadata) => {
      calls.push({ type: 'audit', userId, action, metadata });
      return { logged: true };
    },
    supabaseRest: async (restPath, options = {}) => {
      calls.push({ type: 'rest', path: restPath, options });
      if (restPath.startsWith('projects?id=eq.')) return sourceRows;
      if (restPath.startsWith('projects?user_id=eq.')) return activeRows;
      if (restPath === 'projects') {
        const body = JSON.parse(options.body || '{}');
        return [{ id: 'copy-1', name: body.name, payload: body.payload, updated_at: body.updated_at, created_at: body.updated_at }];
      }
      return [];
    },
  };
  delete require.cache[require.resolve(sharedPath)];
  delete require.cache[require.resolve(projectsApiPath)];
  require.cache[require.resolve(sharedPath)] = { id: sharedPath, filename: sharedPath, loaded: true, exports: mockShared };
  const handler = require(projectsApiPath);
  const response = createResponse();
  await handler({
    method: 'POST',
    url: '/api/projects?action=duplicate&id=source-1',
    headers: { authorization: 'Bearer test-token' },
    on() {},
  }, response);
  if (previousLimit === undefined) delete process.env.BETA_PROJECT_PAYLOAD_BYTES;
  else process.env.BETA_PROJECT_PAYLOAD_BYTES = previousLimit;
  delete require.cache[require.resolve(projectsApiPath)];
  delete require.cache[require.resolve(sharedPath)];
  return { response, calls };
}

(async () => {
  let result = await runDuplicateCase({
    sourceRows: [{ id: 'source-1', name: 'Project A', payload: { tasks: [{ id: '1' }] } }],
    expectedStatus: 200,
  });
  check(result.response.statusCode === 200, 'Duplicate success should return 200');
  const insertCall = result.calls.find((call) => call.type === 'rest' && call.path === 'projects');
  const insertBody = JSON.parse(insertCall.options.body);
  check(insertBody.user_id === 'user-123', 'Duplicate insert must use the authenticated user id');
  check(insertBody.payload?.tasks?.[0]?.id === '1', 'Duplicate insert must use source payload, not caller payload');
  check(insertBody.id === undefined, 'Duplicate insert must not trust caller-supplied id');

  result = await runDuplicateCase({ sourceRows: [], expectedStatus: 404 });
  check(result.response.statusCode === 404, 'Duplicate missing/foreign/archived source should return 404');

  result = await runDuplicateCase({
    sourceRows: [{ id: 'source-1', name: 'Project A', payload: { tasks: [] } }],
    activeRows: Array.from({ length: 10 }, (_, index) => ({ id: 'p' + index })),
    expectedStatus: 403,
  });
  check(result.response.statusCode === 403, 'Duplicate should enforce beta project quota');

  result = await runDuplicateCase({
    sourceRows: [{ id: 'source-1', name: 'Large Project', payload: { data: 'x'.repeat(64) } }],
    expectedStatus: 413,
    payloadLimit: '16',
  });
  check(result.response.statusCode === 413, 'Duplicate should enforce payload size limit');

  console.log('cloud project ownership preflight ok');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
