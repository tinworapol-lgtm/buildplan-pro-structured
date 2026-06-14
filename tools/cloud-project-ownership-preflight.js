const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(projectDir, 'api/projects/index.js'), 'utf8');
const accountUi = fs.readFileSync(path.join(projectDir, 'assets/js/services/account-cloud-ui.js'), 'utf8');
const gantt = fs.readFileSync(path.join(projectDir, 'assets/js/modules/05-gantt-rendering.js'), 'utf8');

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
  accountUi.includes('setCurrentProjectId?.(\'\')'),
  'Signing out must clear the current cloud project id'
);
check(
  gantt.includes("BuildPlanCloud?.setCurrentProjectId?.('')"),
  'Creating a new plan must clear the current cloud project id'
);

console.log('cloud project ownership preflight ok');
