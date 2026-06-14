// BuildPlan Pro cloud project adapter.
// Local import/export remains the fallback; this adapter only activates when backend endpoints are configured.
(function bootstrapBuildPlanCloud(global) {
  const config = global.BuildPlanConfig || {};
  const cloudConfig = config.cloud || {};
  const staticDemoMode = config.licensing?.mode === 'static-demo' || cloudConfig.provider === 'static-demo';
  const currentProjectStorageKey = cloudConfig.currentProjectStorageKey || 'buildplan_current_cloud_project_id';

  function getEndpoint() {
    if (staticDemoMode) return '';
    return cloudConfig.endpoints?.projects || '';
  }

  function isCloudConfigured() {
    return !!getEndpoint();
  }

  function getCurrentProjectId() {
    try {
      return global.localStorage?.getItem(currentProjectStorageKey) || '';
    } catch (_error) {
      return '';
    }
  }

  function setCurrentProjectId(projectId) {
    try {
      if (projectId) global.localStorage?.setItem(currentProjectStorageKey, projectId);
      else global.localStorage?.removeItem(currentProjectStorageKey);
    } catch (_error) {}
    return projectId || '';
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...global.BuildPlanAuth?.getAuthorizationHeaders?.(),
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || 'Cloud request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function listProjects() {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, projects: [] };
    return requestJson(endpoint);
  }

  async function saveProject(projectData, options = {}) {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, message: 'Cloud project endpoint is not configured' };
    const payload = projectData || global.collectProjectData?.();
    const result = await requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options.id || getCurrentProjectId() || payload?.id,
        name: options.name || payload?.info?.name || payload?.projectInfo?.name,
        projectData: payload,
      }),
    });
    if (result.project?.id) setCurrentProjectId(result.project.id);
    return result;
  }

  async function loadProject(projectId) {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, project: null };
    if (!projectId) throw new Error('projectId is required');
    return requestJson(endpoint + '?id=' + encodeURIComponent(projectId));
  }

  async function applyCloudProject(projectId) {
    const result = await loadProject(projectId);
    if (result.project?.payload && typeof global.applyProjectData === 'function') {
      global.applyProjectData(result.project.payload);
      setCurrentProjectId(result.project.id || projectId);
    }
    return result;
  }

  async function renameProject(projectId, name) {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, message: 'Cloud project endpoint is not configured' };
    if (!projectId) throw new Error('projectId is required');
    const result = await requestJson(endpoint + '?id=' + encodeURIComponent(projectId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return result;
  }

  async function deleteProject(projectId) {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, archived: false };
    if (!projectId) throw new Error('projectId is required');
    const result = await requestJson(endpoint + '?id=' + encodeURIComponent(projectId), {
      method: 'DELETE',
    });
    if (projectId === getCurrentProjectId()) setCurrentProjectId('');
    return result;
  }

  async function exportUserData() {
    const endpoint = '/api/export';
    return requestJson(endpoint);
  }

  global.BuildPlanCloud = {
    isCloudConfigured,
    listProjects,
    saveProject,
    loadProject,
    renameProject,
    deleteProject,
    exportUserData,
    applyCloudProject,
    getCurrentProjectId,
    setCurrentProjectId,
  };
})(window);
