// BuildPlan Pro cloud project adapter.
// Local import/export remains the fallback; this adapter only activates when backend endpoints are configured.
(function bootstrapBuildPlanCloud(global) {
  const config = global.BuildPlanConfig || {};
  const cloudConfig = config.cloud || {};
  const staticDemoMode = config.licensing?.mode === 'static-demo' || cloudConfig.provider === 'static-demo';

  function getEndpoint() {
    if (staticDemoMode) return '';
    return cloudConfig.endpoints?.projects || '';
  }

  function isCloudConfigured() {
    return !!getEndpoint();
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
    return requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: options.id || payload?.id,
        name: options.name || payload?.projectInfo?.name,
        projectData: payload,
      }),
    });
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
    }
    return result;
  }

  async function deleteProject(projectId) {
    const endpoint = getEndpoint();
    if (!endpoint) return { configured: false, archived: false };
    if (!projectId) throw new Error('projectId is required');
    return requestJson(endpoint + '?id=' + encodeURIComponent(projectId), {
      method: 'DELETE',
    });
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
    deleteProject,
    exportUserData,
    applyCloudProject,
  };
})(window);
