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

  function openProject() {
    return unavailableAction();
  }

  function createProject() {
    return unavailableAction();
  }

  function renameProject() {
    return unavailableAction();
  }

  function duplicateProject() {
    return unavailableAction();
  }

  function archiveProject() {
    return unavailableAction();
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
    if (target.dataset.projectHubOpen) openProject(target.dataset.projectHubOpen);
    else if (target.dataset.projectHubRename) renameProject(target.dataset.projectHubRename);
    else if (target.dataset.projectHubDuplicate) duplicateProject(target.dataset.projectHubDuplicate);
    else if (target.dataset.projectHubArchive) archiveProject(target.dataset.projectHubArchive);
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
