# Project Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างหน้า Project Hub แบบเต็มหน้าที่เปิดอัตโนมัติหลัง Verify สำเร็จ และให้ผู้ใช้สร้าง เปิด เปลี่ยนชื่อ ทำสำเนา และย้ายโครงการไปถังขยะได้อย่างปลอดภัย

**Architecture:** เพิ่ม route `projects` ใน app shell และแยก UI behavior เป็น `project-hub.js` ซึ่งเรียกผ่าน `BuildPlanCloud` เท่านั้น การทำสำเนาใช้ `POST /api/projects?action=duplicate&id=<projectId>` ใน Vercel Function เดิม โดย API ตรวจ session และ ownership ก่อนคัดลอก payload ไปยัง row ใหม่

**Tech Stack:** HTML, Tailwind utility classes ที่ bundle อยู่ในโปรเจกต์, Vanilla JavaScript, Vercel Functions, Supabase REST/Postgres, Node VM smoke tests

---

## File Map

- Modify `index.html`: เพิ่ม Project Hub markup และโหลด `project-hub.js`
- Modify `assets/css/modules/05-app-shell.css`: style เฉพาะ Project Hub และ responsive states
- Create `assets/js/services/project-hub.js`: state, render, list/open/rename/duplicate/archive และ route events
- Modify `assets/js/services/app-shell.js`: เพิ่ม route `projects` และเปลี่ยน flow หลัง login/Verify
- Modify `assets/js/services/account-cloud-ui.js`: หลัง Verify ไป Project Hub และลด modal ให้เหลือ account utilities
- Modify `assets/js/services/cloud-save-adapter.js`: เพิ่ม `duplicateProject`
- Modify `api/projects/index.js`: เพิ่ม server-side duplicate action ที่ตรวจ ownership
- Modify `tools/app-shell-smoke.js`: route/markup regression
- Modify `tools/browser-account-cloud-smoke.js`: Verify routing regression
- Create `tools/project-hub-smoke.js`: DOM/service behavior test
- Modify `tools/cloud-project-ownership-preflight.js`: duplicate ownership/security markers
- Modify `tools/quality-gate.js` และ `package.json`: เพิ่ม Project Hub test
- Modify `tools/production-url-smoke.js` และ preflight: production markers

### Task 1: Project Hub Route And Page Shell

**Files:**
- Modify: `tools/app-shell-smoke.js`
- Modify: `index.html`
- Modify: `assets/js/services/app-shell.js`
- Modify: `assets/css/modules/05-app-shell.css`

- [ ] **Step 1: Write the failing route and markup checks**

เพิ่ม checks:

```js
check('project-hub-markup', html.includes('id="app-project-hub"'));
check('project-hub-route', shell.includes("'projects'") && shell.includes("setDisplay('app-project-hub'"));
check('project-hub-actions', html.includes('data-project-hub-new') && html.includes('data-project-hub-refresh'));
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node tools\app-shell-smoke.js
```

Expected: FAIL at `project-hub-markup`.

- [ ] **Step 3: Add the Project Hub page**

เพิ่ม `<section id="app-project-hub">` ก่อน `ct-program-selector` โดยมี:

```html
<section id="app-project-hub" class="app-shell-page project-hub-page" hidden aria-hidden="true">
  <header class="project-hub-header">
    <div class="project-hub-brand">BuildPlan Pro</div>
    <div class="project-hub-account">
      <span data-project-hub-email></span>
      <button type="button" data-project-hub-home>กลับหน้าแรก</button>
      <button type="button" data-project-hub-signout>ออกจากระบบ</button>
    </div>
  </header>
  <main class="project-hub-main">
    <div class="project-hub-toolbar">
      <div><h1>โครงการของฉัน</h1><p><span data-project-hub-count>0</span> โครงการ</p></div>
      <div>
        <button type="button" data-project-hub-refresh aria-label="รีเฟรช"><i class="fa-solid fa-rotate"></i></button>
        <button type="button" data-project-hub-new><i class="fa-solid fa-plus"></i> สร้างโครงการใหม่</button>
      </div>
    </div>
    <div data-project-hub-status></div>
    <div data-project-hub-list></div>
  </main>
</section>
```

- [ ] **Step 4: Add route visibility**

ใน `app-shell.js`:

```js
const routes = ['home', 'login', 'projects', 'programs', 'billing', 'user-dashboard', 'admin-dashboard', 'workspace'];
```

และใน `applyRouteVisibility`:

```js
setDisplay('app-project-hub', route === 'projects' ? 'flex' : 'none');
```

- [ ] **Step 5: Add responsive CSS**

กำหนด full-page layout, toolbar, project grid และ mobile breakpoint โดยไม่ใช้ nested cards และใช้ card เฉพาะ project item:

```css
.project-hub-page { min-height: 100vh; flex-direction: column; background: #f4f7fb; color: #10233f; }
.project-hub-main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; }
.project-hub-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
```

- [ ] **Step 6: Run the test and verify GREEN**

Run:

```powershell
node tools\app-shell-smoke.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add index.html assets/css/modules/05-app-shell.css assets/js/services/app-shell.js tools/app-shell-smoke.js
git commit -m "feat: add project hub route"
```

### Task 2: Project Hub Rendering And Navigation

**Files:**
- Create: `tools/project-hub-smoke.js`
- Create: `assets/js/services/project-hub.js`
- Modify: `index.html`
- Modify: `tools/quality-gate.js`
- Modify: `package.json`

- [ ] **Step 1: Write a failing VM DOM smoke test**

สร้าง fake DOM และ mock:

```js
BuildPlanAuth.refreshSession = async () => ({
  authenticated: true,
  user: { email: 'owner@example.com' },
});
BuildPlanCloud.listProjects = async () => ({
  projects: [{ id: 'p1', name: 'อาคารสำนักงาน ABC', updatedAt: '2026-06-14T08:30:00Z' }],
});
```

Assertions:

```js
assert(typeof window.BuildPlanProjectHub?.load === 'function');
await window.BuildPlanProjectHub.load();
assert(list.innerHTML.includes('อาคารสำนักงาน ABC'));
assert(list.innerHTML.includes('data-project-hub-open="p1"'));
assert(count.textContent === '1');
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node tools\project-hub-smoke.js
```

Expected: FAIL because `project-hub.js` does not exist.

- [ ] **Step 3: Implement minimal Project Hub service**

สร้าง namespace:

```js
window.BuildPlanProjectHub = {
  initialize,
  load,
  openProject,
  createProject,
  renameProject,
  duplicateProject,
  archiveProject,
};
```

`load()` ต้อง:

1. ตรวจ session
2. ถ้าไม่ authenticated ให้ route `login`
3. render loading state
4. เรียก `BuildPlanCloud.listProjects()`
5. render project cards หรือ empty state

Project card ต้องมี:

```html
<button data-project-hub-open="p1">เปิดโครงการ</button>
<button data-project-hub-rename="p1">เปลี่ยนชื่อ</button>
<button data-project-hub-duplicate="p1">ทำสำเนา</button>
<button data-project-hub-archive="p1">ย้ายไปถังขยะ</button>
```

- [ ] **Step 4: Bind route event**

ฟัง:

```js
window.addEventListener('buildplan:app-route', (event) => {
  if (event.detail?.route === 'projects') load();
});
```

- [ ] **Step 5: Load the service with cache bust**

ใน `index.html`:

```html
<script src="assets/js/services/project-hub.js?v=phase44"></script>
```

ให้อยู่หลัง `cloud-save-adapter.js` และก่อน `app-shell.js`

- [ ] **Step 6: Add quality gate command**

เพิ่ม:

```json
"smoke:project-hub": "node tools/project-hub-smoke.js"
```

และ step `project-hub` ใน `tools/quality-gate.js`

- [ ] **Step 7: Run tests**

```powershell
node tools\project-hub-smoke.js
node tools\quality-gate.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add assets/js/services/project-hub.js index.html package.json tools/project-hub-smoke.js tools/quality-gate.js
git commit -m "feat: render cloud projects hub"
```

### Task 3: Verify And Workspace Navigation

**Files:**
- Modify: `tools/browser-account-cloud-smoke.js`
- Modify: `assets/js/services/account-cloud-ui.js`
- Modify: `assets/js/services/app-shell.js`
- Modify: `assets/js/services/project-hub.js`

- [ ] **Step 1: Write failing Verify routing check**

หลัง `verifyOtp()`:

```js
check(
  'verify-navigates-project-hub',
  fakeWindow.BuildPlanAppShell.getRoute() === 'projects'
);
```

และตรวจว่ารายการถูกโหลดหนึ่งครั้ง

- [ ] **Step 2: Run test and verify RED**

```powershell
node tools\browser-account-cloud-smoke.js
```

Expected: FAIL at `verify-navigates-project-hub`.

- [ ] **Step 3: Navigate after successful Verify**

ใน `verifyOtp()`:

```js
if (session?.authenticated || refreshed?.authenticated) {
  closePanel();
  global.BuildPlanAppShell?.navigateTo?.('projects');
}
```

Project Hub route event เป็นผู้โหลดรายการ เพื่อป้องกัน API call ซ้ำ

- [ ] **Step 4: Route authenticated users to Project Hub**

เพิ่ม helper ใน `app-shell.js`:

```js
async function navigateAccountHome() {
  const session = await global.BuildPlanAuth?.refreshSession?.();
  return navigateTo(session?.authenticated ? 'projects' : 'home');
}
```

ปุ่มกลับหน้าหลักใน Workspace เรียก helper นี้แทน `navigateHome`

- [ ] **Step 5: New project behavior**

ใน `project-hub.js`:

```js
function createProject() {
  global.BuildPlanCloud?.setCurrentProjectId?.('');
  global.BuildPlanAppShell?.openProjectStartPopup?.();
}
```

ก่อนเปิด popup ให้ route ไป `workspace` แบบไม่แสดงข้อมูลเก่าที่ Hub

- [ ] **Step 6: Run tests**

```powershell
node tools\browser-account-cloud-smoke.js
node tools\project-hub-smoke.js
node tools\app-shell-smoke.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add assets/js/services/account-cloud-ui.js assets/js/services/app-shell.js assets/js/services/project-hub.js tools/browser-account-cloud-smoke.js
git commit -m "feat: route signed in users to projects"
```

### Task 4: Open, Rename, Archive Actions

**Files:**
- Modify: `tools/project-hub-smoke.js`
- Modify: `assets/js/services/project-hub.js`

- [ ] **Step 1: Add failing action tests**

Mocks:

```js
BuildPlanCloud.applyCloudProject = async (id) => ({ project: { id, name: 'Project A', payload: { tasks: [] } } });
BuildPlanCloud.renameProject = async (id, name) => ({ project: { id, name } });
BuildPlanCloud.deleteProject = async () => ({ archived: true });
```

Assertions:

```js
await hub.openProject('p1');
assert(appShellRoute === 'workspace');
await hub.renameProject('p1', 'Project B');
assert(listReloadCount === 1);
await hub.archiveProject('p1', true);
assert(listReloadCount === 2);
```

- [ ] **Step 2: Run test and verify RED**

```powershell
node tools\project-hub-smoke.js
```

- [ ] **Step 3: Implement actions**

- `openProject`: apply payload แล้ว route workspace
- `renameProject`: รับชื่อผ่าน SweetAlert input หรือ prompt fallback แล้ว reload
- `archiveProject`: ยืนยันก่อน archive แล้ว reload
- error ทุก action ต้อง render ใน `[data-project-hub-status]`

- [ ] **Step 4: Run test and verify GREEN**

```powershell
node tools\project-hub-smoke.js
```

- [ ] **Step 5: Commit**

```powershell
git add assets/js/services/project-hub.js tools/project-hub-smoke.js
git commit -m "feat: manage projects from hub"
```

### Task 5: Secure Server-Side Duplicate

**Files:**
- Modify: `tools/cloud-project-ownership-preflight.js`
- Modify: `api/projects/index.js`
- Modify: `assets/js/services/cloud-save-adapter.js`
- Modify: `contracts/cloud-projects-api.contract.json`
- Modify: `tools/cloud-current-project-smoke.js`

- [ ] **Step 1: Add failing ownership checks**

Require API markers:

```js
api.includes("action === 'duplicate'")
api.includes('&user_id=eq.' + encodeURIComponent(session.user.id))
api.includes("'สำเนา - ' + source.name")
```

และ adapter:

```js
typeof cloud.duplicateProject === 'function'
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
node tools\cloud-project-ownership-preflight.js
node tools\cloud-current-project-smoke.js
```

- [ ] **Step 3: Implement duplicate API**

ใน `POST` branch ก่อน normal save:

```js
const action = url.searchParams.get('action');
if (action === 'duplicate') {
  if (!projectId) return sendJson(response, 400, { message: 'Project id is required' });
  const sourceRows = await supabaseRest(
    'projects?id=eq.' + encodeURIComponent(projectId) +
    '&user_id=eq.' + encodeURIComponent(session.user.id) +
    '&archived_at=is.null&select=id,name,payload&limit=1'
  );
  const source = sourceRows?.[0];
  if (!source) return sendJson(response, 404, { message: 'Project not found' });
  // enforce BETA_PROJECT_LIMIT before insert
  // insert new row without id
}
```

ชื่อสำเนา:

```js
('สำเนา - ' + source.name).slice(0, 160)
```

- [ ] **Step 4: Add adapter method**

```js
async function duplicateProject(projectId) {
  return requestJson(endpoint + '?action=duplicate&id=' + encodeURIComponent(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
```

ห้ามตั้ง duplicated ID เป็น current project จนกว่าผู้ใช้จะกดเปิด

- [ ] **Step 5: Update API contract**

เพิ่ม `POST /api/projects?action=duplicate&id=:id` พร้อม response summary

- [ ] **Step 6: Run tests**

```powershell
node tools\cloud-project-ownership-preflight.js
node tools\cloud-current-project-smoke.js
node tools\quality-gate.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add api/projects/index.js assets/js/services/cloud-save-adapter.js contracts/cloud-projects-api.contract.json tools/cloud-current-project-smoke.js tools/cloud-project-ownership-preflight.js
git commit -m "feat: securely duplicate cloud projects"
```

### Task 6: Simplify Account Modal

**Files:**
- Modify: `tools/browser-account-cloud-smoke.js`
- Modify: `assets/js/services/account-cloud-ui.js`

- [ ] **Step 1: Write failing UI scope checks**

```js
check('account-modal-no-project-list', !service.includes('account-cloud-projects'));
check('account-modal-no-env-diagnostics', !service.includes('envLines'));
check('account-modal-has-project-hub-link', service.includes('เปิดโครงการของฉัน'));
```

- [ ] **Step 2: Run test and verify RED**

```powershell
node tools\browser-account-cloud-smoke.js
```

- [ ] **Step 3: Remove project list and diagnostics**

Account modal เก็บเฉพาะ:

- Email / OTP
- สถานะ signed in/out
- ปุ่ม `เปิดโครงการของฉัน`
- Export data
- Feedback
- Sign out

ไม่แสดง `app 2/2`, `supabase 3/3`, Stripe env หรือ next actions

- [ ] **Step 4: Run tests**

```powershell
node tools\browser-account-cloud-smoke.js
node tools\function-invocation-guard-preflight.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add assets/js/services/account-cloud-ui.js tools/browser-account-cloud-smoke.js
git commit -m "refactor: simplify account cloud panel"
```

### Task 7: Production Markers And End-To-End Verification

**Files:**
- Modify: `tools/production-url-smoke.js`
- Modify: `tools/production-url-smoke-preflight.js`
- Modify: `index.html`

- [ ] **Step 1: Add production smoke markers**

ตรวจ:

```js
html.includes('id="app-project-hub"')
html.includes('project-hub.js?v=phase44')
projectHubJs.includes('BuildPlanProjectHub')
projectHubJs.includes('data-project-hub-open')
```

- [ ] **Step 2: Run pre-deploy verification**

```powershell
node tools\quality-gate.js
git diff --check
```

Expected: all PASS, no whitespace errors.

- [ ] **Step 3: Commit final markers**

```powershell
git add index.html tools/production-url-smoke.js tools/production-url-smoke-preflight.js
git commit -m "test: cover project hub production flow"
```

- [ ] **Step 4: Push and deploy**

```powershell
git push
& "$env:APPDATA\npm\vercel.cmd" --yes --prod --archive tgz
```

- [ ] **Step 5: Verify production**

```powershell
node tools\production-url-smoke.js
```

ตรวจ API unauthenticated:

```powershell
node -e "fetch('https://buildplan-pro-structured.vercel.app/api/projects').then(r=>{console.log(r.status);if(r.status!==401)process.exit(1)})"
```

Expected:

- Production smoke PASS
- `/api/projects` without token returns `401`
- Project Hub assets return HTTP 200

- [ ] **Step 6: Final Git verification**

```powershell
git status --short
git log -3 --oneline
```

Expected: clean working tree.
