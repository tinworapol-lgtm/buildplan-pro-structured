// BuildPlan Pro cloud project hub.
(function bootstrapBuildPlanProjectHub(global) {
  let initialized = false;
  let loadGeneration = 0;

  function getElement(selector) {
    return global.document?.querySelector?.(selector) || null;
  }

  function setText(selector, value) {
    const element = getElement(selector);
    if (element) element.textContent = value || '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resetHubState() {
    setText('[data-project-hub-email]', '');
    setText('[data-project-hub-count]', '0');
    setText('[data-project-hub-status]', '');
    const list = getElement('[data-project-hub-list]');
    if (list) list.innerHTML = '';
  }

  function renderLoading() {
    setText('[data-project-hub-count]', '0');
    setText('[data-project-hub-status]', 'กำลังโหลดโครงการ...');
    const list = getElement('[data-project-hub-list]');
    if (list) list.innerHTML = '';
  }

  function renderEmpty() {
    const list = getElement('[data-project-hub-list]');
    if (!list) return;
    list.innerHTML = [
      '<div class="project-hub-empty">',
      '<strong>ยังไม่มีโครงการบน Cloud</strong>',
      '<span>เริ่มต้นโดยกดปุ่มสร้างโครงการใหม่</span>',
      '</div>',
    ].join('');
  }

  function renderProjects(projects) {
    const list = getElement('[data-project-hub-list]');
    if (!list) return;
    if (!projects.length) {
      renderEmpty();
      return;
    }
    list.innerHTML = projects.map((project) => {
      const id = escapeHtml(project?.id);
      const labelName = project?.name || 'โครงการไม่มีชื่อ';
      const openLabel = escapeHtml('เปิดโครงการ ' + labelName);
      const renameLabel = escapeHtml('เปลี่ยนชื่อโครงการ ' + labelName);
      const duplicateLabel = escapeHtml('ทำสำเนาโครงการ ' + labelName);
      const archiveLabel = escapeHtml('เก็บโครงการ ' + labelName);
      const name = escapeHtml(project?.name || 'โครงการไม่มีชื่อ');
      const updatedAt = project?.updatedAt
        ? escapeHtml(new Date(project.updatedAt).toLocaleString('th-TH'))
        : 'ยังไม่มีข้อมูลการแก้ไข';
      return [
        '<article class="project-hub-card">',
        '<div class="project-hub-card-copy">',
        '<h2>' + name + '</h2>',
        '<span>แก้ไขล่าสุด ' + updatedAt + '</span>',
        '</div>',
        '<div class="project-hub-card-actions">',
        '<button type="button" data-project-hub-open="' + id + '" aria-label="' + openLabel + '">เปิดโครงการ</button>',
        '<button type="button" data-project-hub-rename="' + id + '" aria-label="' + renameLabel + '">เปลี่ยนชื่อ</button>',
        '<button type="button" data-project-hub-duplicate="' + id + '" aria-label="' + duplicateLabel + '">ทำสำเนา</button>',
        '<button type="button" data-project-hub-archive="' + id + '" aria-label="' + archiveLabel + '">เก็บถาวร</button>',
        '</div>',
        '</article>',
      ].join('');
    }).join('');
  }

  function unavailableAction() {
    const message = 'ฟังก์ชันนี้จะพร้อมใช้งานในขั้นตอนถัดไป';
    setText('[data-project-hub-status]', message);
    return { ok: false, unavailable: true, message };
  }

  function actionFailure(error, fallbackMessage) {
    const message = error?.message || fallbackMessage;
    setText('[data-project-hub-status]', message);
    return { ok: false, error, message };
  }

  async function openProject(projectId) {
    try {
      setText('[data-project-hub-status]', 'Opening project...');
      const result = await global.BuildPlanCloud?.applyCloudProject?.(projectId);
      if (!result || result.ok === false) {
        throw new Error(result?.message || 'Unable to open project.');
      }
      global.BuildPlanAppShell?.navigateTo?.('workspace');
      setText('[data-project-hub-status]', 'Project opened.');
      return { ok: true, ...result };
    } catch (error) {
      return actionFailure(error, 'Unable to open project.');
    }
  }

  function createProject() {
    global.BuildPlanCloud?.setCurrentProjectId?.('');
    if (typeof global.BuildPlanAppShell?.openProjectStartPopup === 'function') {
      return global.BuildPlanAppShell.openProjectStartPopup();
    }
    global.BuildPlanAppShell?.navigateTo?.('workspace');
    return global.BuildPlanAppShell?.navigateWorkspace?.();
  }

  async function askRenameName() {
    if (typeof global.Swal?.fire === 'function') {
      const response = await global.Swal.fire({
        title: 'Rename project',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Save',
      });
      if (!response?.isConfirmed) return null;
      return response.value;
    }
    if (typeof global.prompt === 'function') {
      return global.prompt('Project name');
    }
    return null;
  }

  async function renameProject(projectId, nextName) {
    try {
      const rawName = nextName === undefined ? await askRenameName() : nextName;
      const name = String(rawName || '').trim();
      if (!name) return { ok: false, cancelled: true };
      const result = await global.BuildPlanCloud?.renameProject?.(projectId, name);
      await load();
      setText('[data-project-hub-status]', 'Project renamed.');
      return { ok: true, ...result };
    } catch (error) {
      return actionFailure(error, 'Unable to rename project.');
    }
  }

  function duplicateProject() {
    return unavailableAction();
  }

  async function confirmArchive() {
    if (typeof global.Swal?.fire === 'function') {
      const response = await global.Swal.fire({
        title: 'Archive project?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Archive',
      });
      return !!response?.isConfirmed;
    }
    if (typeof global.confirm === 'function') {
      return global.confirm('Archive this project?');
    }
    return false;
  }

  async function archiveProject(projectId, confirmed) {
    try {
      const shouldArchive = confirmed === true ? true : await confirmArchive();
      if (!shouldArchive) return { ok: false, cancelled: true };
      const result = await global.BuildPlanCloud?.deleteProject?.(projectId);
      await load();
      setText('[data-project-hub-status]', 'Project archived.');
      return { ok: true, ...result };
    } catch (error) {
      return actionFailure(error, 'Unable to archive project.');
    }
  }

  function navigateHome() {
    if (typeof global.BuildPlanAppShell?.navigateHome === 'function') {
      global.BuildPlanAppShell.navigateHome();
    } else {
      global.BuildPlanAppShell?.navigateTo?.('home');
    }
  }

  function signOut() {
    loadGeneration += 1;
    global.BuildPlanCloud?.setCurrentProjectId?.('');
    global.BuildPlanAuth?.clearAccessToken?.();
    resetHubState();
    navigateHome();
  }

  async function load() {
    const generation = ++loadGeneration;
    resetHubState();
    try {
      const session = await global.BuildPlanAuth?.refreshSession?.();
      if (generation !== loadGeneration) return { ok: false, stale: true };
      if (!session?.authenticated) {
        global.BuildPlanAppShell?.navigateTo?.('login');
        return { ok: false, authenticated: false };
      }

      setText('[data-project-hub-email]', session.user?.email || '');
      renderLoading();
      const result = await global.BuildPlanCloud?.listProjects?.();
      if (generation !== loadGeneration) return { ok: false, stale: true };
      const projects = Array.isArray(result?.projects) ? result.projects : [];
      setText('[data-project-hub-count]', String(projects.length));
      renderProjects(projects);
      setText(
        '[data-project-hub-status]',
        projects.length ? 'พบโครงการ ' + projects.length + ' โครงการ' : 'ยังไม่มีโครงการบน Cloud',
      );
      return { ok: true, projects };
    } catch (error) {
      const message = error?.message || 'ไม่สามารถโหลดรายการโครงการได้';
      setText('[data-project-hub-count]', '0');
      setText('[data-project-hub-status]', message);
      return { ok: false, error, message };
    }
  }

  function handleListClick(event) {
    const target = event?.target?.closest?.('button');
    if (!target) return;
    if (target.dataset.projectHubOpen) void openProject(target.dataset.projectHubOpen);
    else if (target.dataset.projectHubRename) void renameProject(target.dataset.projectHubRename);
    else if (target.dataset.projectHubDuplicate) duplicateProject(target.dataset.projectHubDuplicate);
    else if (target.dataset.projectHubArchive) void archiveProject(target.dataset.projectHubArchive);
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    getElement('[data-project-hub-refresh]')?.addEventListener?.('click', load);
    getElement('[data-project-hub-new]')?.addEventListener?.('click', createProject);
    getElement('[data-project-hub-home]')?.addEventListener?.('click', navigateHome);
    getElement('[data-project-hub-signout]')?.addEventListener?.('click', signOut);
    getElement('[data-project-hub-list]')?.addEventListener?.('click', handleListClick);
    global.addEventListener?.('buildplan:app-route', (event) => {
      if (event?.detail?.route === 'projects') load();
    });
  }

  global.BuildPlanProjectHub = {
    initialize,
    load,
    openProject,
    createProject,
    renameProject,
    duplicateProject,
    archiveProject,
  };

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})(window);
