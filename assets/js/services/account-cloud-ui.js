// BuildPlan Pro Account/Cloud UI bridge.
// This adds a compact operator-facing panel without coupling the planner to a specific auth vendor UI.
(function bootstrapAccountCloudUi(global) {
  let panelReady = false;

  function getText(value, fallback = '') {
    return value == null || value === '' ? fallback : String(value);
  }

  function ensurePanel() {
    if (panelReady || !global.document?.body) return;
    const panel = global.document.createElement('div');
    panel.id = 'account-cloud-panel';
    panel.className = 'fixed inset-0 bg-slate-950/45 hidden items-center justify-center z-[80] no-print';
    panel.innerHTML = [
      '<div class="bg-white w-[min(680px,calc(100vw-32px))] rounded-xl shadow-2xl border border-slate-200 overflow-hidden">',
      '<div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">',
      '<div><div class="text-base font-black text-slate-900">Account & Cloud</div><div id="account-cloud-status" class="text-xs text-slate-500 mt-0.5">Checking...</div></div>',
      '<button type="button" id="account-cloud-close" class="w-9 h-9 rounded-lg border border-slate-300 hover:bg-white text-slate-600"><i class="fa-solid fa-xmark"></i></button>',
      '</div>',
      '<div class="p-5 grid gap-4">',
      '<div class="grid md:grid-cols-[1fr_auto] gap-3 items-end">',
      '<label class="grid gap-1 text-sm font-bold text-slate-700">Email<input id="account-cloud-email" type="email" class="modern-input rounded-lg border border-slate-300 px-3 py-2" placeholder="you@example.com"></label>',
      '<button type="button" id="account-cloud-send" class="h-10 px-4 rounded-lg bg-narit-blue text-white text-sm font-bold">Send code</button>',
      '</div>',
      '<div class="grid md:grid-cols-[1fr_auto] gap-3 items-end">',
      '<label class="grid gap-1 text-sm font-bold text-slate-700">Login code<input id="account-cloud-code" type="text" inputmode="numeric" class="modern-input rounded-lg border border-slate-300 px-3 py-2" placeholder="6-digit code"></label>',
      '<button type="button" id="account-cloud-verify" class="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold">Verify</button>',
      '</div>',
      '<div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">',
      '<button type="button" id="account-cloud-refresh" class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700">Refresh status</button>',
      '<button type="button" id="account-cloud-save" class="px-3 py-2 rounded-lg bg-narit-blue text-white text-sm font-bold">Save to cloud</button>',
      '<button type="button" id="account-cloud-list" class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700">List projects</button>',
      '<button type="button" id="account-cloud-delete" class="px-3 py-2 rounded-lg border border-amber-200 text-sm font-bold text-amber-700">Archive project</button>',
      '<button type="button" id="account-cloud-export" class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700">Export my data</button>',
      '<button type="button" id="account-cloud-feedback" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold">ส่ง Feedback</button>',
      '<button type="button" id="account-cloud-signout" class="px-3 py-2 rounded-lg border border-red-200 text-sm font-bold text-red-600">Sign out</button>',
      '</div>',
      '<div id="account-cloud-output" class="min-h-[72px] rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 whitespace-pre-wrap"></div>',
      '</div>',
      '</div>',
    ].join('');
    global.document.body.appendChild(panel);
    global.document.getElementById('account-cloud-close')?.addEventListener('click', closePanel);
    global.document.getElementById('account-cloud-send')?.addEventListener('click', requestOtp);
    global.document.getElementById('account-cloud-verify')?.addEventListener('click', verifyOtp);
    global.document.getElementById('account-cloud-refresh')?.addEventListener('click', refreshStatus);
    global.document.getElementById('account-cloud-save')?.addEventListener('click', saveCloud);
    global.document.getElementById('account-cloud-list')?.addEventListener('click', loadCloudList);
    global.document.getElementById('account-cloud-delete')?.addEventListener('click', deleteCloudProject);
    global.document.getElementById('account-cloud-export')?.addEventListener('click', exportUserData);
    global.document.getElementById('account-cloud-feedback')?.addEventListener('click', submitFeedback);
    global.document.getElementById('account-cloud-signout')?.addEventListener('click', signOut);
    panelReady = true;
  }

  function setOutput(message) {
    const output = global.document?.getElementById('account-cloud-output');
    if (output) output.textContent = message;
  }

  function setStatus(message) {
    const status = global.document?.getElementById('account-cloud-status');
    if (status) status.textContent = message;
    const badge = global.document?.getElementById('account-cloud-badge');
    if (badge) badge.textContent = message;
  }

  function getEmailAndCode() {
    return {
      email: global.document?.getElementById('account-cloud-email')?.value?.trim() || '',
      code: global.document?.getElementById('account-cloud-code')?.value?.trim() || '',
    };
  }

  function openPanel() {
    ensurePanel();
    const panel = global.document?.getElementById('account-cloud-panel');
    if (panel) panel.classList.replace('hidden', 'flex');
    refreshStatus();
  }

  function closePanel() {
    const panel = global.document?.getElementById('account-cloud-panel');
    if (panel) panel.classList.replace('flex', 'hidden');
  }

  async function refreshStatus() {
    const auth = await global.BuildPlanAuth?.refreshSession?.();
    const license = await global.BuildPlanLicense?.refreshLicenseStatus?.();
    const saas = await global.BuildPlanSaaS?.refreshReadiness?.();
    const label = auth?.authenticated ? getText(auth.user?.email, 'Signed in') : 'Signed out';
    setStatus(label + ' | ' + getText(license?.status, 'license unknown'));
    const envLines = [];
    if (saas?.envStatus) {
      for (const [groupName, group] of Object.entries(saas.envStatus)) {
        envLines.push(groupName + ': ' + (group.readyCount || 0) + '/' + (group.totalCount || 0));
        if (group.missing?.length) envLines.push('  missing: ' + group.missing.join(', '));
      }
    }
    const nextActions = Array.isArray(saas?.nextActions) && saas.nextActions.length
      ? ['Next actions:', ...saas.nextActions.map((item, index) => (index + 1) + '. ' + item)]
      : [];
    setOutput([
      'Auth: ' + (auth?.authenticated ? 'signed in' : 'signed out'),
      'License: ' + getText(license?.status, '-'),
      'SaaS env: ' + (saas?.configured ? 'ready' : 'missing setup'),
      ...envLines,
      ...nextActions,
    ].filter(Boolean).join('\n'));
  }

  async function requestOtp() {
    const { email } = getEmailAndCode();
    setOutput('Sending login code...');
    const result = await global.BuildPlanAuth?.requestEmailOtp?.(email);
    setOutput(result?.message || 'Login code sent. Check your email.');
  }

  async function verifyOtp() {
    const { email, code } = getEmailAndCode();
    setOutput('Verifying code...');
    const session = await global.BuildPlanAuth?.verifyEmailOtp?.(email, code);
    setOutput(session?.authenticated ? 'Signed in as ' + getText(session.user?.email, email) : 'Verification completed');
    await refreshStatus();
  }

  async function saveCloud() {
    setOutput('Saving current project to cloud...');
    const result = await global.BuildPlanCloud?.saveProject?.();
    setOutput(result?.project ? 'Saved: ' + result.project.name : (result?.message || 'Cloud save request finished'));
  }

  async function loadCloudList() {
    setOutput('Loading cloud projects...');
    const result = await global.BuildPlanCloud?.listProjects?.();
    const projects = result?.projects || [];
    setOutput(projects.length ? projects.map((project) => project.name + ' | ' + project.updatedAt).join('\n') : (result?.message || 'No cloud projects found'));
  }

  async function deleteCloudProject() {
    const projectId = global.prompt?.('Project ID to archive');
    if (!projectId) return;
    setOutput('Archiving cloud project...');
    const result = await global.BuildPlanCloud?.deleteProject?.(projectId.trim());
    setOutput(result?.archived ? 'Archived project: ' + projectId : (result?.message || 'Archive request finished'));
  }

  async function submitFeedback() {
    const message = global.prompt?.('Feedback / ปัญหาที่พบ / ฟีเจอร์ที่อยากได้');
    if (!message) return;
    setOutput('Sending feedback...');
    const endpoint = global.BuildPlanConfig?.cloud?.endpoints?.feedback || '';
    if (!endpoint) {
      setOutput('Feedback endpoint is not configured');
      return;
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...global.BuildPlanAuth?.getAuthorizationHeaders?.(),
      },
      body: JSON.stringify({
        rating: 5,
        message,
        feature_request: '',
        project_context: {
          projectName: global.document?.getElementById('proj-name')?.value || '',
          route: global.location?.hash || '',
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setOutput(response.ok ? 'Feedback sent. Thank you.' : (payload.message || 'Unable to send feedback'));
  }

  async function exportUserData() {
    setOutput('Exporting user data...');
    const result = await global.BuildPlanCloud?.exportUserData?.();
    setOutput(result?.exportType === 'buildplan-user-export'
      ? 'Export ready: ' + (result.projects?.length || 0) + ' projects, ' + (result.feedback?.length || 0) + ' feedback items'
      : (result?.message || 'Export request finished'));
  }

  function signOut() {
    global.BuildPlanAuth?.clearAccessToken?.();
    setOutput('Signed out.');
    refreshStatus();
  }

  function initializeAccountCloudUi() {
    ensurePanel();
    global.document?.getElementById('btn-account-cloud')?.addEventListener('click', openPanel);
    global.addEventListener?.('buildplan:auth-state', refreshStatus);
    refreshStatus();
  }

  global.BuildPlanAccountCloud = {
    initializeAccountCloudUi,
    openPanel,
    closePanel,
    refreshStatus,
    requestOtp,
    verifyOtp,
    saveCloud,
    loadCloudList,
    deleteCloudProject,
    submitFeedback,
    exportUserData,
  };

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initializeAccountCloudUi);
  } else {
    initializeAccountCloudUi();
  }
})(window);
